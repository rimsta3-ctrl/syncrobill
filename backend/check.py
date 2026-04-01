from eth_account import Account 
a = Account.from_key('be81d4f2b00e67f4aecdaa154554706f3ba3166dac9b42a3843ca856d1b538a6') 
print('Ton adresse:', a.address) 
print('Attendue:   ', '0xe8C9AbBf6ee89921140115f1BaE5c8feC3aF1A57') 
print('Match:', a.address.lower() == '0xe8C9AbBf6ee89921140115f1BaE5c8feC3aF1A57'.lower()) 
