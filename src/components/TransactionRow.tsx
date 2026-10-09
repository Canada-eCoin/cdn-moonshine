import React, { memo } from "react";
import {
	StyleSheet,
	TouchableOpacity
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import { View, Text } from "../styles/components";

const moment = require("moment");
const {
	formatNumber,
	normalize
} = require("../utils/helpers");

const {
	getCoinData
} = require("../utils/networks");

interface TransactionRowComponent {
	id: string,
	coin: string,
	address: string,
	hash: string,
	amount: number,
	label: string,
	date: number,
	transactionBlockHeight: number,
	exchangeRate: number | string,
	currentBlockHeight: number,
	fiatSymbol: string,
	cryptoUnit: string,
	type: string,
	onTransactionPress: Function,
	messages: [],
	isBlacklisted: boolean
}
const _TransactionRow = (
	{
		id = "",
		coin = "bitcoin",
		address = "",
		hash = "",
		amount = 0,
		label = "",
		date = 0,
		transactionBlockHeight = 0,
		exchangeRate = "0",
		currentBlockHeight = 0,
		fiatSymbol = "$",
		cryptoUnit = "satoshi",
		type = "received",
		onTransactionPress = () => null,
		messages = [],
		isBlacklisted = false
	}: TransactionRowComponent) => {

	const getCryptoAmountLabel = () => {
		try {
			//This prevents the view from displaying 0 BTC
			if (amount < 50000 && cryptoUnit === "BTC") {
				return `${formatNumber(Number((amount * 0.00000001).toFixed(8)))} BTC`;
			} else {
				return `${Number(amount/100000000).toFixed(8)} ${getCoinData({selectedCrypto: coin, cryptoUnit}).acronym}`;
			}
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	const getFiatAmountLabel = () => {
		try {
			const cryptoRate = Number(exchangeRate) * 0.00000001;
			let label = (Number(amount)*cryptoRate).toFixed(2);
			label = type === "sent" ? `-${fiatSymbol}${formatNumber(Math.abs(Number(label)).toFixed(2))}` : `+${fiatSymbol}${formatNumber(label)}`;
			return label;
		} catch (e) {
			console.log(e);
			return 0;
		}
	};

	const getConfirmations = () => {
		try {
			if (transactionBlockHeight === null || currentBlockHeight === null) return "?";
			return transactionBlockHeight !== 0 ? formatNumber(Math.abs(Number(currentBlockHeight)) - (Math.abs(Number(transactionBlockHeight - 1)))) : 0;
		} catch (e) {
			console.log(e);
			return "?";
		}
	};

	const getMessages = () => {
		try {
			let message = "";
			const messageLength = messages.length;
			messages.forEach((item, i) => {
				if (i+1 === messageLength) {
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

	if (!address || !amount) return <View />;

	// if (!label) label = address;
	label = hash;
	if (label.length > 32) label = `${label.substr(0, 5)}:${label.substr(label.length-5, label.length)}`;
	const fontWeight = type === "sent" ? "normal" : "bold";
	const txidText = `${label.substr(0, 5)}:${label.substr(label.length-5, label.length)}`;
	const addressText = `${address.substr(0, 6)}:${address.substr(address.length-4, address.length)}`;

	return (
		<TouchableOpacity onPress={() => onTransactionPress(id)} style={[styles.container, {borderColor: `${getCoinData({selectedCrypto:coin}).color}99`}]}>
			<View type="gray3" style={styles.header}>

			{type === 'received' && <Text style={[styles.labelText, styles.receivedText]}>received</Text>}
			{type === 'sent' && <Text style={[styles.labelText, styles.sentText]}>sent</Text>}
				<Text style={[ styles.labelSubtext ]}> via</Text>
				<Text style={[ styles.labelSubtext ]}> txid</Text>
				<Text style={[ styles.labelText ]}> {txidText}</Text>

				<Text style={[ styles.labelSubtext ]}> to</Text>


				<Text style={[ styles.labelSubtext ]}> address</Text>
				<Text style={[ styles.labelText ]}> {addressText}</Text>




			</View>
			<View style={styles.row}>
				<View style={styles.col1}>
					{/*<Text style={[styles.text, { fontWeight, fontSize: normalize(14)  }]}>{label}</Text>*/}
					<Text style={[styles.dateText]}>{moment.unix(date).format('l @ h:mm a')}</Text>
					<Text style={[styles.smallText]}>{getConfirmations()} blocks ago</Text>
				</View>
				<View style={styles.col2}>
					<Text style={[styles.balanceText]}>{type === "received" ? "+" : "-"}{getCryptoAmountLabel()}</Text>

				{isBlacklisted &&<Text style={[styles.text, { color: "red", fontWeight: "bold", fontSize: normalize(12) }]}>locked from spending</Text> ||  Number(exchangeRate) !== 0 &&<Text style={[styles.subBalance, { fontWeight }]}>{getFiatAmountLabel()}</Text>  }


					{Number(exchangeRate) === 0 && <Text></Text> }
				</View>
			</View>






			{messages.length > 0 &&
			<View style={styles.row}>
				<View style={[styles.col1, { flex: 0.6 }]}>
					<Text style={[styles.text, { fontWeight, fontSize: normalize(16)  }]}>Message:</Text>
				</View>
				<View style={[styles.col2, { flex: 1 }]}>
					<Text style={[styles.text, { fontWeight }]}>{getMessages()}</Text>
				</View>
			</View>}
		</TouchableOpacity>
	);
};

_TransactionRow.propTypes = {
	id: PropTypes.string,
	coin: PropTypes.string.isRequired,
	address: PropTypes.string,
	amount: PropTypes.number.isRequired,
	label: PropTypes.string,
	date: PropTypes.number,
	transactionBlockHeight: PropTypes.number.isRequired,
	exchangeRate: PropTypes.string.isRequired,
	currentBlockHeight: PropTypes.number.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired,
	onTransactionPress: PropTypes.func.isRequired,
	messages: PropTypes.arrayOf(PropTypes.string).isRequired
};


const styles = StyleSheet.create({
	container: {
		paddingTop: 2,
		flex: 1,
		backgroundColor: "transparent",
		borderColor: `#999`,
		borderWidth: 1,
		borderRadius: 3,
		marginTop: 3,

	},
	header: {
		flexDirection: 'row',
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 2,
		paddingHorizontal: 10,
		borderColor: "#3333",
		borderBottomWidth: 1
	},
	row: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 8,
		paddingTop: 2
	},
	col1: {
		flex: 2,
		alignItems: "flex-start",
		flexShrink: 1,
		justifyContent: "center",
		paddingLeft: 10,
	},
	col2: {
		flex: 3,
		alignItems: "flex-end",
		justifyContent: "center",
		paddingRight: 10
	},
	labelText: {
		...systemWeights.bold,
		fontSize: normalize(12),
		fontFamily: 'monospace',
		textAlign: "right"
	},
	labelSubtext: {
		...systemWeights.regular,
		fontSize: normalize(11),
		textAlign: "right"
	},
	text: {
		...systemWeights.light,
		fontSize: normalize(14),
		fontFamily: 'monospace',
		textAlign: "center"
	},
	balanceText: {
		...systemWeights.bold,
		fontFamily: 'monospace',
		fontSize: normalize(16),
		textAlign: "center"
	},
	subBalance: {
		...systemWeights.regular,
		fontFamily: 'monospace',
		fontSize: normalize(12),
		textAlign: "center"
	},
	dateText: {
		...systemWeights.regular,
		fontFamily: 'system',
		fontSize: normalize(12),
		textAlign: "center"
	},
	smallText: {
		...systemWeights.regular,
		fontFamily: 'system',
		fontSize: normalize(12),
		textAlign: "center"
	},
	sentText: {
		...systemWeights.bold,
		fontSize: normalize(12),
		textAlign: "left",
    backgroundColor: "#3F100022",
    borderColor: "#9F6000",
    borderRadius:3,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
	},
	receivedText: {
		...systemWeights.bold,
		fontSize: normalize(12),
		textAlign: "left",
    backgroundColor: "#1F2A1022",
    borderColor: "#4F8A10",
    borderRadius:3,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
	}
});


//ComponentShouldNotUpdate
const TransactionRow = memo(
	_TransactionRow,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return nextProps === prevProps;
	}
);
export default TransactionRow;
