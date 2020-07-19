import os

key = input("Enter Tallycoin API Key: ")

stream = os.popen("base64 ~/.lnd/tls.cert | tr -d '\n'")
cert = stream.read()

stream = os.popen("base64 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '\n'")
macaroon = stream.read()

json =  '{ "tallycoin_api":"'+key+'", "tls_cert":"'+cert+'", "macaroon":"'+macaroon+'"}'

fd = open("tallycoin.key","w")
fd.write(json)

print("\n")
print("Done")
