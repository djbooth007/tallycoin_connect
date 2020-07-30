import os
import socket

stream = os.popen("base64 /home/bitcoin/.lnd/tls.cert | tr -d '\n'")
cert = stream.read()

stream = os.popen("base64 /home/bitcoin/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '\n'")
macaroon = stream.read()

json =  '{ "tallycoin_api":"", "tls_cert":"'+cert+'", "macaroon":"'+macaroon+'"}'

fd = open("tallycoin_api.key","w")
fd.write(json)

print("Enter your API key at http://"+socket.gethostbyname(socket.gethostname())+":8123/" )
