from dotenv import load_dotenv 
import os 
result = load_dotenv(verbose=True) 
print('loaded:', result) 
print('key:', repr(os.getenv('SYNCROBILL_SIGNER_PRIVATE_KEY'))) 
