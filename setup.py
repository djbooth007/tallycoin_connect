import os
from os import path
import socket
import json

# modify default service file

service = os.popen("cat tallycoin_connect.service").read();
cwd = os.getcwd()
new_service = service.replace("{{working_directory}}", cwd);

# save service file

fd = open("tallycoin_connect.service","w");
fd.write(new_service);

# setup always-on service

os.popen("sudo cp tallycoin_connect.service /etc/systemd/system/").read();
os.popen("sudo systemctl daemon-reload").read();

os.popen("sudo systemctl enable tallycoin_connect.service").read();
os.popen("sudo systemctl start tallycoin_connect.service").read(); 

# get LND keys and save to file

stream = os.popen("base64 /home/bitcoin/.lnd/tls.cert | tr -d '\n'");
cert = stream.read();

stream = os.popen("base64 /home/bitcoin/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '\n'");
macaroon = stream.read();

if path.exists("tallycoin_api.key"):
  stream = os.popen("cat tallycoin_api.key");
  k = stream.read();
  key = json.loads(k);
  key = key['tallycoin_api'];
else:  
  key = ''; 

json =  '{ "tallycoin_api":"'+key+'", "tls_cert":"'+cert+'", "macaroon":"'+macaroon+'"}';

# write keys

fd = open("tallycoin_api.key","w");
fd.write(json);
os.chmod("tallycoin_api.key", 0o777);

print("Enter your API key at http://"+socket.gethostbyname(socket.gethostname())+":8123/" );
