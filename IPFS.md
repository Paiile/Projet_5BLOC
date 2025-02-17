# Deploy and store the contract using IPFS

## Install IPFS

1. Download archive
	`wget https://dist.ipfs.tech/kubo/v0.33.0/kubo_v0.33.0_linux-amd64.tar.gz`
2. Unzip
	`tar -xvzf kubo_v0.33.0_linux-amd64.tar.gz`
3. Install
	```sh
	cd kubo
	sudo bash install.sh
	```

## Compile your smart contract

`npx hardhat compile`
You should have a new folder `artifacts` at the root of the project

## Deploy it using IPFS

1. Start IPFS
```bash
ipfs init
ipfs daemon
``` 

2. Create your files to IPFSHash

`ipfs add -r ./artifacts` 

3. Retrieve and save the IPFSHash
You will find the CID of the folder at the last logged line

Here, the IPFSHash is : `QmNzmXC2j8LxejoT6Fn71ecRi42KuWwTwguavFVqpTgonG`

4. Upload your files to IPFS
`ipfs files cp /ipfs/QmNzmXC2j8LxejoT6Fn71ecRi42KuWwTwguavFVqpTgonG /TCGGame`

## Verify the deployment
1. Open browser at `localhost:5001/webui`
2. Go to the section `Files` and check for your project
