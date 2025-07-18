import React, { PureComponent } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	InteractionManager,
	Alert
} from "react-native";
import { systemWeights } from "react-native-typography";
import bitcoinUnits from "bitcoin-units";
import Button from "./Button";
import DefaultModal from "./DefaultModal";
import Loading from "./Loading";
import { View, Text, ScrollView, EvilIcon, TextInput } from "../styles/components";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	capitalize,
	openUrl,
	openTxId,
	formatNumber,
	createTransaction,
	getByteCount
} = require("../utils/helpers");

const {
	getCoinData,
	supportsRbf
} = require("../utils/networks");

const moment = require("moment");
const memoPlaceholders = [
	"Alpaca Socks...",
	"Pizza...",
	"Coffee...",
	"Knitting Supplies...",
	"Money printer go brrr...",
	"More Coffee...",
	"Croissants!",
	"Catnip...",
	"Dog Food...",
	"Lamps, I love lamps...",
	"Graboid Deterrents...",
	"D20 Dice Case...",
	"Bag of Hodling...",
	"Mithril Armour Repair...",
	"Grayscale Treatment...",
	"Dire Wolf Boarding...",
	"Holodeck Rental...",
	"Bloodwine...",
	"Striga Removal...",
	"Tribble Purchase...",
	"EMH Installation..."
];

const getRandomPlaceholder = () => {
	try {
		return memoPlaceholders[Math.floor((Math.random()*memoPlaceholders.length))];
	} catch {return memoPlaceholders[0];}
};

class TransactionDetail extends PureComponent {
	
	constructor(props){
		super(props);
		let rbfIsSupported = false;
		try {rbfIsSupported = this.canRbf();} catch (e) {}
		this.state = {
			transactionData: {},
			loading: false,
			loadingMessage: `Updating fee.\nOne moment please.`,
			initialFee: 1, //sat/byte
			rbfValue: 0, //sat/byte
			rbfIsSupported,
			randomPlaceholder: getRandomPlaceholder()
		};
		
		//Handle long press when updating rbfValue
		this.rbfValueTimer = null;
		this.updateRbfValue = this.updateRbfValue.bind(this);
		this.stopRbfValueTimer = this.stopRbfValueTimer.bind(this);
	}
	
	componentDidMount() {
		//Attempt to set rbfData if able.
		InteractionManager.runAfterInteractions(() => {
			try {
				const {selectedWallet, selectedCrypto} = this.props.wallet;
				const wallet = this.props.wallet.wallets[selectedWallet];
				const rbfIsSupported = this.canRbf();
				if (!rbfIsSupported) {
					this.setState({rbfIsSupported});
					return;
				}
				const {hash} = this.props.wallet.selectedTransaction;
				const {transactionFee} = wallet.rbfData[selectedCrypto][hash];
				this.setState({initialFee: transactionFee, rbfValue: transactionFee + 1, rbfIsSupported});
			} catch (e) {}
		});
	}
	
	Row = ({ title = "", value = "", onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) => {
		try {
			return (
				<View style={styles.row}>
					<View style={[styles.col1, col1Style]}>
						<Text type="text2" style={[styles.title, titleStyle]}>{title}</Text>
					</View>
					<TouchableOpacity onPress={onPress} style={[styles.col2, col2Style]}>
						<Text type="text2" style={[styles.text, valueStyle]}>{value}</Text>
					</TouchableOpacity>
				</View>
			);
		} catch (e) {
			console.log(e);
		}
	};
	
	RbfRow = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const addressIndex = this.props.wallet.wallets[selectedWallet].addressIndex[selectedCrypto];
			const nextAvailableAddress = this.props.wallet.wallets[selectedWallet].addresses[selectedCrypto][addressIndex].address;
			return (
				<View style={{ marginTop: 20, alignItems: "center", justifyContent: "center" }}>
					<Text type="text2" style={[styles.text, { textAlign: "center", ...systemWeights.bold }]}>Transaction taking too long?</Text>
					<Text type="text2" style={[styles.text, { textAlign: "center", ...systemWeights.regular }]}>Cancel the transaction or increase the fee for a faster transaction:</Text>
					<View style={[styles.row, { alignItems: "center", justifyContent: "center" }]}>
						<TouchableOpacity onPressIn={() => this.updateRbfValue("decrease")} onPressOut={this.stopRbfValueTimer} style={styles.icon}>
							<EvilIcon type="text2" name={"minus"} size={42} />
						</TouchableOpacity>
						<View style={{ flex: 1.5 }}>
							<Text type="text2" style={[styles.title, { padding: 5 }]}>
								{this.getRbfAmout()}
							</Text>
						
						</View>
						<TouchableOpacity onPressIn={() => this.updateRbfValue("increase")} onPressOut={this.stopRbfValueTimer} style={styles.icon}>
							<EvilIcon name={"plus"} size={42} />
						</TouchableOpacity>
					</View>
					<View style={[styles.row, { marginTop: 20 }]}>
						<Button style={{ ...styles.button, width: "47%", marginRight: 5 }} textStyle={{...systemWeights.semibold, fontSize: 16 }} text={"Cancel\nTransaction"} onPress={() => this.cancelTransaction(nextAvailableAddress)} />
						<Button style={{ ...styles.button, width: "47%", marginLeft: 5 }} textStyle={{...systemWeights.semibold, fontSize: 16 }} text={"Increase\nFee"} onPress={this.attemptRbf} />
					</View>
				</View>
			);
		} catch (e) {}
	};
	
	openBlock = (block): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/block-height/${block}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/block-height/${block}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/block/LTC/${block}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/block/LTC/${block}`;
        if (selectedCrypto === "canadaecoin") url = `https://chainz.cryptoid.info/cdn/block.dws?${block}`;
        if (selectedCrypto === "auroracoin") url = `https://chainz.cryptoid.info/aur/block.dws?${block}`;
        if (selectedCrypto === "egulden") url = `https://chainz.cryptoid.info/efl/block.dws?${block}`;
        if (selectedCrypto === "emark") url = `https://chainz.cryptoid.info/dem/block.dws?${block}`;
        openUrl(url);
	};
	
	openAddress = (address = ""): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		if (selectedCrypto === "bitcoin") url = `https://blockstream.info/address/${address}`;
		if (selectedCrypto === "bitcoinTestnet") url = `https://blockstream.info/testnet/address/${address}`;
		if (selectedCrypto === "litecoin") url = `https://chain.so/address/LTC/${address}`;
		if (selectedCrypto === "litecoinTestnet") url = `https://chain.so/address/LTCTEST/${address}`;
        if (selectedCrypto === "canadaecoin") url = `https://chainz.cryptoid.info/cdn/address.dws?${address}`;
        if (selectedCrypto === "auroracoin") url = `https://chainz.cryptoid.info/aur/address.dws?${address}`;
        if (selectedCrypto === "egulden") url = `https://chainz.cryptoid.info/efl/address.dws?${address}`;
        if (selectedCrypto === "emark") url = `https://chainz.cryptoid.info/dem/address.dws?${address}`;
		openUrl(url);
	};
	
	openMessage = (tx = ""): void => {
		let url = "";
		const selectedCrypto = this.props.wallet.selectedCrypto;
		switch (selectedCrypto) {
			case "bitcoin":
				url = `https://chain.so/tx/BTC/${tx}`;
				break;
			case "bitcoinTestnet":
				url = `https://chain.so/tx/BTCTEST/${tx}`;
				break;
			case "litecoin":
				url = `https://chain.so/tx/LTC/${tx}`;
				break;
			case "litecoinTestnet":
				url = `https://chain.so/tx/LTCTEST/${tx}`;
				break;
			case "canadaecoin":
				url = `https://explorer.canadaecoin.ca/tx/${tx}`;
				break;				
			default:
				return;
		}
		openUrl(url);
	};
	

	bitcoinRate = () => {
			if(!this.props.wallet.selectedCurrency.toUpperCase()) return 0;
			if(!this.props.rates[this.props.wallet.selectedCurrency.toUpperCase()]) return 0;
	 		return	1 / Number(this.props.rates[this.props.wallet.selectedCurrency.toUpperCase()].rate);
	}
	
	fiatRate = () => {
			if(!getCoinData( this.props.wallet.selectedCrypto )) return 0;
			if(!this.props.rates[getCoinData( this.props.wallet.selectedCrypto ).acronym]) return 0;
			const fiatRate = this.bitcoinRate() * Number(this.props.rates[getCoinData( this.props.wallet.selectedCrypto ).acronym.toUpperCase()].rate)
	 		return fiatRate;
	};
	
	getAmount = (amount, displayFeePerByte = true): string => {
		try {
			const cryptoUnit = this.props.settings.cryptoUnit;
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const selectedCurrency = this.props.wallet.selectedCurrency;


			const exchangeRate = this.fiatRate()
			const fiatSymbol = this.props.settings.fiatSymbol;
			amount = Number(amount);
			const crypto = cryptoUnit === "satoshi" ? amount : bitcoinUnits(amount, "satoshi").to(cryptoUnit).value();
			bitcoinUnits.setFiat("usd", exchangeRate);
			let fiat = bitcoinUnits(amount, "satoshi").to("usd").value().toFixed(2);
			fiat = amount < 0 ? `-${fiatSymbol}${formatNumber(Math.abs(fiat).toFixed(2))}` : `${fiatSymbol}${formatNumber(fiat)}`;
			//If rbfIsSupported include the initialFee provided by the rbfData for the transaction
			if (this.state.rbfIsSupported && displayFeePerByte) {
				const initialFee = this.state.initialFee;
				const { acronym, oshi, label } = getCoinData({selectedCrypto, cryptoUnit});
				return `${fiat}\n${formatNumber(crypto)} ${acronym}\n${initialFee} ${oshi}/byte`;
			}
			// return `${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym} // ${fiat} ${selectedCurrency.toUpperCase()}`;
			return `${formatNumber(crypto)} ${getCoinData({ selectedCrypto, cryptoUnit }).acronym}`;
		} catch (e) {
			return "$0.00\n0 sats";
		}
	};
	
	canAffordRbf = (rbfValue = undefined): boolean => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			rbfValue = rbfValue ? rbfValue : this.state.rbfValue;
			const hash = this.props.wallet.selectedTransaction.hash;
			const rbfData = this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto][hash];
			let message = "";
			try {message = rbfData.message;} catch {}
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			const transactionSize = getByteCount(
				{[addressType]:rbfData.utxos.length},
				{[addressType]:!rbfData.changeAddress ? 1 : 2},
				message
			);
			const currentBalance = Number(this.props.wallet.wallets[selectedWallet].confirmedBalance[selectedCrypto]);
			
			//Get original fee total
			const initialFeePerByte = rbfData.transactionFee;
			const initialTotalFee = transactionSize * initialFeePerByte;
			
			//Set the difference between the new and old fee values
			const totalFee = rbfValue * transactionSize;
			const feeDifference = Math.abs(totalFee-initialTotalFee);
			return currentBalance > feeDifference;
			
		} catch (e) {}
	};
	
	//Returns the RBF text for the transaction row & RBF loading modal.
	getRbfAmout = () => {
		try {
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const { hash } = this.props.wallet.selectedTransaction;
			const cryptoUnit = this.props.settings.cryptoUnit;
			const exchangeRate = this.fiatRate()
			const rbfData = this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto][hash];
			const fiatSymbol = this.props.settings.fiatSymbol;
			
			let message = "";
			try {message = rbfData.message;} catch {}
			
			const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
			const transactionSize = getByteCount({[addressType]:rbfData.utxos.length},{[addressType]:!rbfData.changeAddress ? 1 : 2}, message);
			
			//Get original fee per byte value
			const initialFeePerByte = rbfData.transactionFee;
			const initialTotalFee = transactionSize * initialFeePerByte;
			
			//Set the difference between the new and old fee values
			let totalFee = transactionSize * this.state.rbfValue;
			totalFee = Math.abs(totalFee-initialTotalFee);
			
			const rbfValue = this.state.rbfValue - initialFeePerByte;
			
			const crypto = cryptoUnit === "satoshi" ? totalFee : bitcoinUnits(totalFee, "satoshi").to(cryptoUnit).value();
			bitcoinUnits.setFiat("usd", exchangeRate);
			let fiat = bitcoinUnits(totalFee, "satoshi").to("usd").value().toFixed(2);
			fiat = totalFee < 0 ? `-${fiatSymbol}${formatNumber(Math.abs(fiat).toFixed(2))}` : `${fiatSymbol}${formatNumber(fiat)}`;
			const { acronym, oshi } = getCoinData({selectedCrypto, cryptoUnit});
			return `+${fiat}\n+${formatNumber(crypto)} ${acronym}\n+${rbfValue} ${oshi}/byte`;
		} catch (e) {}
	};
	
	getConfirmations = () => {
		try {
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			if (transaction.block === null || transaction.block === 0) return 0;
			const selectedCrypto = this.props.wallet.selectedCrypto;
			const currentBlockHeight = this.props.wallet.blockHeight[selectedCrypto];
			return formatNumber(Number(currentBlockHeight) - (Number(transaction.block) - 1));
		} catch (e) {
			console.log(e);
			return 0;
		}
	};
	
	//Returns all OP_RETURN messages, if any, for the selected transaction.
	getMessages = (): string => {
		try {
			let message = "";
			let transaction = "";
			try {transaction = this.props.wallet.selectedTransaction;} catch (e) {}
			const messageLength = transaction.messages.length;
			transaction.messages.forEach((item, i) => {
				if (messageLength === 1 && i+1 === messageLength) {
					message = message.concat(`${item}`);
				} else {
					message = message.concat(`${item}\n`);
				}
			});
			return message;
		} catch (e) {
			console.log(e);
			return "";
		}
	};
	
	toggleUtxoBlacklist = async (): void => {
		try {
			const transaction = this.props.wallet.selectedTransaction.hash;
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
			const blacklistedUtxos = this.props.wallet.wallets[selectedWallet].blacklistedUtxos[selectedCrypto];
			await this.props.toggleUtxoBlacklist({ transaction, selectedWallet, selectedCrypto });
			await this.props.updateBalance({ utxos, blacklistedUtxos, selectedCrypto, wallet: selectedWallet });
		} catch (e) {}
	};
	
	isBlacklisted = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const blacklistedUtxos = this.props.wallet.wallets[selectedWallet].blacklistedUtxos[selectedCrypto];
			let transacationHash = "";
			try { transacationHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			return blacklistedUtxos.includes(transacationHash);
		} catch (e) {
			console.log(e);
			return false;
		}
	};
	
	isActiveUtxo = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			const utxos = this.props.wallet.wallets[selectedWallet].utxos[selectedCrypto];
			let transactionHash = "";
			try { transactionHash = this.props.wallet.selectedTransaction.hash; } catch (e) {}
			let txHashes = utxos.map((utxo) => utxo.tx_hash);
			return txHashes.includes(transactionHash);
		} catch (e) {
			return false;
		}
	};
	
	canRbf = (): boolean => {
		try {
			const { selectedCrypto, selectedWallet } = this.props.wallet;
			//Ensure the selected coin supports RBF and that RBF is enabled in Settings.
			if (!supportsRbf[selectedCrypto] || !this.props.settings.rbf) return false;
			
			//Ensure this is a sent transaction
			const { type } = this.props.wallet.selectedTransaction;
			if (type !== "sent") return false;
			
			//Ensure the transaction is still unconfirmed.
			const confirmations = this.getConfirmations();
			if (confirmations > 0) return false;
			
			//Ensure the user has enough funds to rbf.
			if (!this.canAffordRbf(1)) return false;
			
			//Ensure the app has stored the necessary data to perform the RBF.
			let rbfData = this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto];
			const hash = this.props.wallet.selectedTransaction.hash;
			return !!rbfData[hash];
		} catch (e) {
			return false;
		}
	};
	
	//Increases or decreases the rbfValue state.
	updateRbfValue = (action = "increase"): void => {
		try {
			const value = action === "increase" ? 1 : -1;
			if (this.state.rbfValue === this.state.initialFee + 1 && action === "decrease") return;
			
			//Ensure the user has enough funds to RBF.
			if (action === "increase" && !this.canAffordRbf(this.state.rbfValue + 1)) return;
			
			if (this.state.rbfValue < this.state.initialFee + 1) {
				this.setState({ rbfValue: this.state.initialFee + 1 });
				return;
			}
			
			this.setState({ rbfValue: this.state.rbfValue + value });
			this.rbfValueTimer = setTimeout(() => this.updateRbfValue(action), 100);
		} catch (e) {}
	};
	
	stopRbfValueTimer(): void {
		clearTimeout(this.rbfValueTimer);
	}
	
	cancelTransaction = async (address = ""): void => {
		try {
			if (!address) return;
			Alert.alert(
				"Cancel Transaction",
				`Are you sure you wish to cancel this transaction? This action can be seen as malicious by the original recipient of this transaction.`,
				[
					{
						text: "No",
						onPress: () => {},
						style: "cancel",
					},
					{text: "Yes", onPress: () => this.attemptRbf(address)},
				]
			);
		} catch (e) {}
	};
	
	attemptRbf = async (address = ""): void => {
		try {
			let loadingMessage = this.getRbfAmout();
			if (address) {
				//Add Cancelling Transaction Message
				loadingMessage = `Cancelling transaction.\nOne moment please.\n\n${loadingMessage}`;
			} else {
				//Add Updating Fee Message
				loadingMessage = `Updating fee.\nOne moment please.\n\n${loadingMessage}`;
			}
			//Set Loading State
			await this.setState({ loading: true, loadingMessage });
			
			InteractionManager.runAfterInteractions(async () => {
				const {selectedWallet, selectedCrypto} = this.props.wallet;
				const transactionFee = this.state.rbfValue;
				const hash = this.props.wallet.selectedTransaction.hash;
				let rbfData = this.props.wallet.wallets[selectedWallet].rbfData[selectedCrypto];
				
				//User appears to be cancelling/re-routing the transaction so add the new "send to" address.
				if (address) rbfData[hash]["address"] = address;
				
				const transaction = await createTransaction({...rbfData[hash], transactionFee, setRbf: true});
				let sendTransactionResult = await this.props.sendTransaction({
					txHex: transaction.data,
					selectedCrypto,
					sendTransactionFallback: this.props.settings.sendTransactionFallback
				});
				
				if (sendTransactionResult.error) {
					this.setState({loading: false});
					this.props.refreshWallet();
					setTimeout(() => {
						InteractionManager.runAfterInteractions(() => {
							alert("There was an error sending your transaction. It is possible that this transaction may have already confirmed. Please refresh your transaction list and try again.");
						});
					},1000);
				} else {
					const newRbfData = transaction.rbfData;
					newRbfData["hash"] = sendTransactionResult.data;
					rbfData[newRbfData.hash] = newRbfData;
					
					let message = "";
					try {message = rbfData.message;} catch {}
					
					//If cancelling a transaction (by including an address), do not store any new rbfData, remove it.
					if (address) try {if (rbfData[newRbfData.hash]) delete rbfData[newRbfData.hash];} catch (e) {}
					
					await this.props.updateWallet({
						wallets: {
							...this.props.wallet.wallets,
							[selectedWallet]: {
								...this.props.wallet.wallets[selectedWallet],
								rbfData: {
									...this.props.wallet.wallets[selectedWallet].rbfData,
									[selectedCrypto]: rbfData
								}
							}
						}
					});
					
					const addressType = this.props.wallet.wallets[selectedWallet].addressType[selectedCrypto];
					const transactionSize = getByteCount({[addressType]:newRbfData.utxos.length},{[addressType]:!newRbfData.changeAddress ? 1 : 2}, message);
					const totalFee = this.state.rbfValue * transactionSize;
					
					//Attempt to add the successful transaction to the transaction list
					const selectedTransaction = this.props.wallet.selectedTransaction;
					const successfulTransaction = [selectedTransaction];
					successfulTransaction[0]["hash"] = sendTransactionResult.data;
					successfulTransaction[0]["fee"] = totalFee;
					
					//Since we cancelled this transaction set the sentAmount & amount to 0.
					if (address) successfulTransaction[0]["sentAmount"] = totalFee;
					if (address) successfulTransaction[0]["amount"] = 0;

					//Add Transaction to transaction stack
					const transactionData = {
						wallet: selectedWallet,
						selectedCrypto,
						transaction: successfulTransaction
					};
					await this.props.addTransaction(transactionData);
					setTimeout(async () => {
						try {
							await this.setState({initialFee: this.state.rbfValue, rbfValue: this.state.rbfValue + 1});
							await this.props.refreshWallet();
							
							//Remove the rbfRow if we cancelled the current transaction
							const rbfIsSupported = address ? false : this.state.rbfIsSupported;
							//Remove Loading State
							this.setState({ loading: false, rbfIsSupported });
						} catch (e) {}
					}, 2000);
				}
			});
		} catch (e) {}
	};
	
	getMemo = () => {
		try {
			const hash = this.props.wallet.selectedTransaction.hash;
			return this.props.wallet.transactionMemos[hash];
		} catch {return " ";}
	}
	
	updateMemo = (memo = "") => {
		try {
			let transactionMemos = {};
			try {transactionMemos = this.props.wallet.transactionMemos;} catch {}
			const hash = this.props.wallet.selectedTransaction.hash;
			this.props.updateWallet({ transactionMemos: { ...transactionMemos, [hash]: memo } });
		} catch {return " ";}
	};
	

	render() {
		if (!this.props.wallet.selectedTransaction) return <View />;
		const { selectedCrypto } = this.props.wallet;
		const { 
			address, amount, block, data, fee, hash, inputAmount, 
			messages, outputAmount, path, recievedAmount, sentAmount,
			timestamp, transactionInputAmount, transactionOutputAmount, type
		} = this.props.wallet.selectedTransaction;
		const confirmations = this.getConfirmations();
		const status = block === 0 || block === null || confirmations === 0 ? "Pending" : "Confirmed";
		const blockHeight = block === 0 ? "?" : block;
		const messagesLength = this.props.wallet.selectedTransaction.messages.length;
		const isBlacklisted = this.isBlacklisted();
		
		let amountSent, amountReceived, transactionFee, totalSent = "$0.00\n0sats";
		try {amountSent = this.getAmount(amount, false);} catch (e) {}
		try {amountReceived = this.getAmount(amount);} catch (e) {}
		try {transactionFee = this.getAmount(fee);} catch (e) {}
		try {totalSent = this.getAmount(sentAmount);} catch (e) {}

	    const firstHalf = (address) => {
	        let addrLength = Math.floor(address.length /2);
	        address = address.slice(0, addrLength)
	        let res = `${address.slice(0,4)} ${address.slice(4,8)} ${address.slice(8,12)}`
	        if(address.length > 20) return `${res} ${address.slice(12,16)} ${address.slice(16, address.length)}`;
	        return `${res} ${address.slice(12, address.length)}`;
	    }

	    const secondHalf = (address) => {
	        let addrLength = Math.floor(address.length /2);
	        address = address.slice(addrLength,  addrLength.length);
	        let res = `${address.slice(0,4)} ${address.slice(4,8)} ${address.slice(8,12)}`
	        if(address.length > 20) return `${res} ${address.slice(12,16)} ${address.slice(16, address.length)}`;
	        return `${res} ${address.slice(12, address.length)}`;
	    }   

	    const prettifyAddress = (address) => {
	    	return `${firstHalf(address)} ${secondHalf(address)}`
	    }
		return (
			<View style={styles.container}>
				
				<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{ flex: 0.9 }}>
					<View style={styles.transactionData}>
						<View style={styles.headerContainer}>
							<Text style={styles.header}>{getCoinData({selectedCrypto}).label} Transaction</Text>
		</View>
							


<TouchableOpacity style={styles.row} onPress={() => this.openAddress(address)}>
	<View style={[styles.col1]}>
		{type === "sent" && <Text style={[styles.title]}>Sent from (tap to explore wallet)</Text>}
		{type === "received" && <Text style={[styles.title]}>received to (tap to explore wallet)</Text>}


		<Text style={styles.code}>{prettifyAddress(address)}</Text>
		<Text style={styles.subtext}>{this.props.wallet.wallets[this.props.wallet.selectedWallet].label}://{path}</Text>



	</View>
</TouchableOpacity>



{/*{this.Row({ title: "Network:", value: getCoinData({selectedCrypto}).label })}*/}



<TouchableOpacity style={styles.row} onPress={() => this.openBlock(blockHeight)}>
	<View style={[styles.col1]}>
		<Text style={[styles.title]}>status: (tap to explore block)</Text>
		<Text style={[styles.text]}>{capitalize(status)} within block { formatNumber(blockHeight) }</Text>						
		<Text style={[styles.subtext]}>{moment.unix(timestamp).format('dddd, MMMM D, YYYY h:mm A Z')}</Text>						
		<Text style={[styles.subtext]}>({this.getConfirmations()} blocks ago/confirmations)</Text>						
	</View>
</TouchableOpacity>


<TouchableOpacity style={styles.row} onPress={() => openTxId(hash, selectedCrypto)}>
	<View style={[styles.col1]}>
		<Text style={[styles.title]}>transaction: (tap to explore tx)</Text>


						{type === "sent" && <Text style={[styles.text]}>Spent {totalSent}</Text>}
						{type === "sent" && <Text style={[styles.text]}>Sent {amountSent}</Text>}
						{type === "received" && <Text style={[styles.text]}>Received {amountReceived}</Text>}

		<Text style={[styles.subtext]}>inputs: { this.getAmount(transactionInputAmount) }</Text>		
		<Text style={[styles.subtext]}>outputs: { this.getAmount(transactionOutputAmount) }</Text>		
		<Text style={[styles.subtext]}>fee: { transactionFee }</Text>						


	</View>
</TouchableOpacity>


<TouchableOpacity style={styles.row} onPress={() => openTxId(hash, selectedCrypto)}>
	<View style={[styles.col1]}>
		<Text style={[styles.title]}>txid/hash: (tap to explore tx)</Text>
		<Text style={[styles.code]}>{ firstHalf(hash) }</Text>		
		<Text style={[styles.code]}>{ secondHalf(hash) }</Text>		
	</View>
</TouchableOpacity>



{messagesLength > 0 && this.Row({ title: "Message:", value: this.getMessages(), onPress: () => this.openMessage(hash), valueStyle: { textDecorationLine: "underline" } })}
						
						



{this.state.rbfIsSupported && confirmations === 0 && this.RbfRow()}






						
						
{/*						<View style={styles.row}>
							<View style={styles.col1}>
								<Text type="text2" style={styles.title}>Memo: </Text>
							</View>
							<View style={styles.col2}>
								<TextInput
									placeholder={this.state.randomPlaceholder}
									style={styles.textInput}
									selectionColor={colors.lightPurple}
									autoCapitalize="none"
									autoCorrect={false}
									onChangeText={text => this.updateMemo(text)}
									value={this.getMemo()}
									multiline={true}
								/>
							</View>
						</View>*/}
						

						
						
						{this.isActiveUtxo() &&
						<Button style={{ ...styles.button, backgroundColor: isBlacklisted ? colors.red : "transparent" }} text={isBlacklisted ? "Unlock unspent transaction" : "Lock unspent transaction"} onPress={this.toggleUtxoBlacklist} />}
						
					</View>
				</ScrollView>
				
				<View type="background3" style={{ flex: 0.1 }} />
				
				<DefaultModal
					isVisible={this.state.loading}
					onClose={() => this.setState({ loading: false })}
					type="View"
					style={styles.modal}
					contentStyle={styles.modalContent}
				>
					<Loading
						textStyle={{ color: colors.darkGray }}
						loadingOpacity={1}
						loadingMessage={this.state.loadingMessage}
						animationName="dino"
						width={400}
						enableProgressBar={false}
					/>
				</DefaultModal>
				
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	separator: {
		height: 1.5,
		width: "100%",
		marginVertical: 8
	},
	col1: {
		alignItems: "flex-start",
	},
	col2: {
		fontSize: 12,
		alignItems: "flex-start",
	},
	transactionData: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5
	},
	row: {
		flexDirection: "column",
		width: "100%",
		marginBottom: 20
	},
	title: {
		...systemWeights.light,
		fontSize: 12,
		textAlign: "center",
	},
	text: {
		fontSize: 18,
		textAlign: "left"
	},
	code: {
		fontSize: 14,
		textAlign: "left",
		fontFamily: 'monospace'
	},
	subtext: {
		fontSize: 14,
		textAlign: "left"
	},
	subHeader: {
		fontSize: 12,
		textAlign: "center",
	},
	header: {
		...systemWeights.bold,
		textAlign: "center",
		fontSize: 20,
	},
	headerContainer: {
		textAlign: "center",
		marginVertical: 20
	},
	button: {
		minWidth: "20%",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	icon: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 5
	},
	modal: {
		flex: 0,
		height: "60%",
		width: "90%"
	},
	modalContent: {
		// backgroundColor: colors.lightGray
	},
	textInput: {
		width: "80%",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.purple,
		padding: 10,
		textAlign: "left",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: "bold",
		paddingTop: 10
	},
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const walletActions = require("../actions/wallet");
const settingsActions = require("../actions/settings");
const transactionActions = require("../actions/transaction");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...walletActions,
		...settingsActions,
		...transactionActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(TransactionDetail);
