import hashlib
import io
import os
import re
from decimal import Decimal, InvalidOperation

from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader

load_dotenv()

REQUIRED_KEYWORDS = ("Bill of Lading", "Shipper", "Consignee")
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
EXPECTED_SERVER_SIGNER = "0xe8C9AbBf6ee89921140115f1BaE5c8feC3aF1A57"

app = FastAPI(
    title="Syncrobill B/L Validation Service",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_signing_key() -> str:
    private_key = os.getenv("SYNCROBILL_SIGNER_PRIVATE_KEY", "").strip()
    if not private_key:
        raise HTTPException(status_code=500, detail="SYNCROBILL_SIGNER_PRIVATE_KEY is not configured.")
    return private_key


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        raw_text = " ".join((page.extract_text() or "") for page in reader.pages)
        text = " ".join(raw_text.split())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to parse PDF: {exc}") from exc

    if not text:
        raise HTTPException(status_code=400, detail="The uploaded PDF has no extractable text.")

    return text


def extract_amounts(text: str) -> list[Decimal]:
    pattern = re.compile(r"(\d+[\.,]\d{1,4})")
    matches = pattern.findall(text)
    extracted: list[Decimal] = []

    for match in matches:
        try:
            extracted.append(Decimal(match.replace(",", ".")))
        except InvalidOperation:
            continue

    return extracted


@app.post("/validate-bl")
async def validate_bill_of_lading(
    file: UploadFile = File(...),
    expected_amount: str = Form(...),
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    extracted_text = extract_text_from_pdf(file_bytes)
    missing_keywords = [keyword for keyword in REQUIRED_KEYWORDS if keyword.lower() not in extracted_text.lower()]
    detected_amounts = extract_amounts(extracted_text)

    try:
        expected_amount_decimal = Decimal(expected_amount)
        amount_match = any(abs(amount - expected_amount_decimal) <= Decimal("0.0001") for amount in detected_amounts)
    except InvalidOperation:
        amount_match = False

    doc_hash_bytes = hashlib.sha256(file_bytes).digest()
    doc_hash_hex = f"0x{doc_hash_bytes.hex()}"

    if missing_keywords or not amount_match:
        return {
            "valid": False,
            "hash": doc_hash_hex,
            "signature": None,
            "metadata": {
                "missing_keywords": missing_keywords,
                "detected_amounts": [str(amount) for amount in detected_amounts],
                "expected_amount": expected_amount,
                "validation_errors": [
                    *(
                        ["Missing required Bill of Lading keywords."]
                        if missing_keywords
                        else []
                    ),
                    *(
                        ["Expected amount not found in the PDF text."]
                        if not amount_match
                        else []
                    ),
                ],
            },
        }

    signer_key = get_signing_key()
    signer_account = Account.from_key(signer_key)
    if signer_account.address.lower() != EXPECTED_SERVER_SIGNER.lower():
        raise HTTPException(
            status_code=500,
            detail=(
                "Signer mismatch: the configured private key does not match "
                f"SERVER_SIGNER. Expected {EXPECTED_SERVER_SIGNER}, got {signer_account.address}."
            ),
        )

    # This signs the raw 32-byte SHA-256 digest using Ethereum's personal_sign / EIP-191 format.
    # Solidity recreates the same value with:
    # keccak256("\x19Ethereum Signed Message:\n32" ++ _docHash)
    signable_message = encode_defunct(primitive=doc_hash_bytes)
    signed_message = Account.sign_message(signable_message, private_key=signer_key)
    signature_hex = signed_message.signature.hex()

    if not signature_hex.startswith("0x"):
        signature_hex = f"0x{signature_hex}"

    return {
        "valid": True,
        "hash": doc_hash_hex,
        "signature": signature_hex,
        "metadata": {
            "signer": signer_account.address,
            "expected_server_signer": EXPECTED_SERVER_SIGNER,
            "detected_amounts": [str(amount) for amount in detected_amounts],
            "expected_amount": str(expected_amount_decimal),
        },
    }
