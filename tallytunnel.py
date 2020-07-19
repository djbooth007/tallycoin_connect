key = input("Enter Tallycoin API key ")

print("\n")
print("Saved to file tallycoin_api.key")

fd = open("tallycoin_api.key","w")
fd.write(key)
