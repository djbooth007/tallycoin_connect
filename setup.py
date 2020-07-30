import os
import socket

# get LND keys and save to file

stream = os.popen("base64 /home/bitcoin/.lnd/tls.cert | tr -d '\n'")
cert = stream.read()

stream = os.popen("base64 /home/bitcoin/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '\n'")
macaroon = stream.read()

json =  '{ "tallycoin_api":"", "tls_cert":"'+cert+'", "macaroon":"'+macaroon+'"}'

# write keys

fd = open("tallycoin_api.key","w")
fd.write(json)

# setup always-on service

stream = os.popen("cat tallycoin_connect.service");
service = stream.read()

fd = open("/etc/systemd/system/tallycoin_connect.service","w")
fd.write(service)

stream = os.popen("systemctl enable dots.service");

print("Enter your API key at http://"+socket.gethostbyname(socket.gethostname())+":8123/" )
