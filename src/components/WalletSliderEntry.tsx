import React, { useEffect, memo } from "react";
import {
	View,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	ScrollView,
	Alert,
	LayoutAnimation,
	Platform
} from "react-native";
import { Text } from "../styles/components"
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import CoinButton from "./CoinButton";


const {
	formatNumber,
	capitalize
} = require("../utils/helpers");

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const { height, width } = Dimensions.get("window");

import { getCoinData } from "../utils/networks";

interface WalletSliderEntryComponent {
	walletId: string,
	wallet: { wallets: {}, selectedWallet: string, walletOrder: string[] },
	cryptoUnit: string,
	updateWallet: Function,
	deleteWallet: Function,
	displayTestnet: boolean,
	onCoinPress: Function,
	updateActiveSlide: Function
}


const _WalletSliderEntry = ({ walletId = "bitcoin", wallet = { wallets: {}, selectedCurrency: "", selectedWallet: "wallet0", walletOrder: [] }, cryptoUnit = "satoshi", fiatSymbol = "", rates = [], updateWallet = () => null, deleteWallet = () => null, displayTestnet = true, onCoinPress = () => null, updateActiveSlide }: WalletSliderEntryComponent) => {
	
	useEffect(() => {
		if (Platform.OS === "ios") LayoutAnimation.easeInEaseOut();
	});
	const { selectedCurrency } = wallet;
	
	const getWalletName = () => {
		try {
			try { if (wallet.wallets[walletId].label !== "") return wallet.wallets[walletId].label; } catch (e) {}
			try { if (wallet.wallets[walletId].name.trim() !== "") return wallet.wallets[walletId].name; } catch (e) {}
			try { return `Wallet ${wallet.walletOrder.indexOf(walletId)}`; } catch (e) {}
		} catch (e) {
			return "?";
		}
	};
	
	const _delWallet = async ({ walletIndex = 0 } = {}) => {

		try {
			if (Object.keys(wallet.wallets).length > 1) {
				const indexOfSelectedWallet = wallet.walletOrder.indexOf(wallet.selectedWallet);
				const totalWallets = wallet.walletOrder.length;
				let newActiveSlide = walletIndex;
				
				//Delete the requested wallet via it's passed in walletId
				await deleteWallet({ wallet: walletId });
				
				//Only update to a new selectedWallet if you delete the currently selectedWallet.
				if (walletIndex === indexOfSelectedWallet) {
					let newWalletIndex = indexOfSelectedWallet;
					//If you're deleting the first wallet in an array of two.
					if (walletIndex === 0 && totalWallets === 2) {
						newWalletIndex = walletIndex;
						//If you're deleting a wallet with an index less than that of the selected wallet
					} else if (walletIndex < indexOfSelectedWallet) {
						newWalletIndex = indexOfSelectedWallet - 1;
						//If you're deleting the currently selectedWallet and the last item in the wallet array.
					} else if (walletIndex === indexOfSelectedWallet && walletIndex === (totalWallets-1)) {
						newWalletIndex = indexOfSelectedWallet - 1;
					}
					await updateWallet({ selectedWallet: wallet.walletOrder[newWalletIndex]});
				}
				
				//Only update the active Wallet Carousel Slider index if it's the last wallet in the array.
				if (walletIndex !== 0 && walletIndex === (totalWallets-1)) newActiveSlide = walletIndex - 1;
				updateActiveSlide(newActiveSlide);
			}
		} catch (e) {
			console.log(e);
		}
	};
	
	const delWallet = async () => {
		try {
			const index = wallet.walletOrder.indexOf(walletId);
			const walletName = getWalletName();
			Alert.alert(
				"Delete Wallet",
				`Are you sure you wish to delete ${walletName}?`,
				[
					{ text: "No", onPress: () => {}, style: "cancel" },
					{ text: "Yes", onPress: () => _delWallet({ walletIndex: index })},
				]
			);
		} catch (e) {
			console.log(e);
		}
	};
	


	// TODO: revamp this section, 
	const fiatInBitcoin = () => {
			if(!wallet.selectedCurrency.toUpperCase()) return 0;
			if(!rates[wallet.selectedCurrency.toUpperCase()]) return 0;
	 		return	Number(rates[wallet.selectedCurrency.toUpperCase()].rate);
	}
	
	const fiatRate = (acronym) => {
		if(!rates[acronym.toUpperCase()]) return 0;
		const rateObj = rates[acronym.toUpperCase()]
		if(!rateObj) return 0;
 		return Number(rateObj.rate);
	};
	
	const priceInSatoshi = (selectedCurrency) => {
		if(!selectedCurrency) return 0;
		if(!rates[selectedCurrency.toUpperCase()]) return 0;
		const rateObj = rates[selectedCurrency.toUpperCase()]
		if(!rateObj) return 0;
 		return Number(rateObj.rate);
	};

	const getEstWalletValue = (walletId)=> {
		if(!walletId) return [];
		let balances = wallet.wallets[walletId].confirmedBalance;
		let estTotalWalletValue = 0;
				
		Object.keys(balances).filter((hyper)=>{

			if(hyper==='timestamp') return false;
			const acronym = getCoinData({ selectedCrypto: hyper }).acronym

			let balance = balances[hyper];
			balance = Number(balance / 100000000);

			let exchangeRate = priceInSatoshi(acronym)
			let btcrate = 1/fiatInBitcoin(acronym)
			let estValueInFiat = ((balance * exchangeRate )  *btcrate);

			estTotalWalletValue = estTotalWalletValue + estValueInFiat;
		});

		return estTotalWalletValue
	}

	const sortedBalances = (walletId)=> {
		if(!walletId) return [];
		console.log(walletId)
		let balances = {...wallet.wallets[walletId].confirmedBalance};
				
		Object.keys(balances).filter((hyper)=>{
			if(hyper==='timestamp') return false;
			const acronym = getCoinData({ selectedCrypto: hyper }).acronym

			let balance = balances[hyper];
			balance = Number(balance / 100000000);

			let exchangeRate = priceInSatoshi(acronym)
			let btcrate = 1/fiatInBitcoin(acronym)
			let estValueInFiat = ((balance * exchangeRate )  *btcrate);
			balances[hyper] = estValueInFiat;
		});

	    return Object.keys(balances).sort((a, b) => balances[b] - balances[a]).reduce((r, k) => (r[k] = balances[k], r), {});
	};

	return (
		<View style={styles.container}>

				<View style={styles.header}>
					<Text style={[styles.headerText ]}>
						{getWalletName()}
					</Text>
					<Text style={[styles.headerBalance ]}>
						${formatNumber(Number(getEstWalletValue(walletId)).toFixed(2))} 
					</Text>
				</View>
				<View style={styles.headerBalanceContainer}>

					{/*						
					<View style={[styles.box, { transform: [{ rotateZ: "90deg" }] }] }>
						<Text style={[styles.headerFiatSign]}>
							{selectedCurrency.toUpperCase()}
						</Text>
					</View>
					*/}

				</View>
				
			<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.innerContainer}>
				
				<View style={styles.scrollViewContent}>


					{Object.keys(sortedBalances(walletId)).map((coin, i) => {
						if (!displayTestnet && coin.toLowerCase().includes("testnet")) return;
						if (coin.toLowerCase().includes("timestamp")) return;

						let seed = wallet.wallets[walletId]
						let balance = seed.confirmedBalance[coin];
						const acronym = getCoinData({ selectedCrypto: coin }).acronym

						{/*let balance = wallet.wallets[walletId].confirmedBalance[coin];*/}

						return (
							<CoinButton
								key={`${coin}${i}`}
								coin={coin}
								label={capitalize(coin)}
								onCoinPress={() => onCoinPress({coin, walletId})}
								walletId={walletId}
								acronym={acronym}
								balance={ balance / 100000000 }
								cryptoUnit={cryptoUnit}
								selectedCrypto={coin}
								selectedCurrency={selectedCurrency}

								priceInSatoshi={priceInSatoshi(acronym)}
								estValueInSatoshi={(balance / 100000000) * priceInSatoshi(acronym)}
								estValueInFiat={((balance / 100000000) * priceInSatoshi(acronym)*fiatInBitcoin(acronym))}
								fiatPrice={fiatRate(acronym) * (1/fiatInBitcoin(acronym))}

								fiatBalance={((balance / 100000000) * priceInSatoshi(acronym)*(1/fiatInBitcoin(acronym)))}

								selectedCryptoByName={getCoinData({ selectedCrypto: coin }).label}
								fiatSymbol={fiatSymbol}
								fiatInBitcoin={fiatInBitcoin(selectedCurrency)}
								fiatValue={(fiatRate(selectedCurrency) * ( 1/ fiatInBitcoin(acronym)))}
								fiatSign={String(selectedCurrency).toUpperCase()}
								fiatRate={fiatRate(selectedCurrency)}
								exchangeRate={(fiatRate(selectedCurrency))}
							/>
						);
					})}
					{Object.keys(wallet.wallets).length > 1 &&
					<TouchableOpacity onPress={delWallet} style={styles.deleteButton}>
						<Text style={[styles.text, { color: colors.danger }]}>Delete Wallet</Text>
					</TouchableOpacity>}


				</View>
				
				<View style={{ paddingVertical: 10 }} />
				
			</ScrollView>
		
		</View>
	);
};

_WalletSliderEntry.propTypes = {
	walletId: PropTypes.string.isRequired,
	wallet: PropTypes.object.isRequired,
	cryptoUnit: PropTypes.string.isRequired,
	updateWallet: PropTypes.func.isRequired,
	deleteWallet: PropTypes.func.isRequired,
	displayTestnet: PropTypes.bool.isRequired,
	onCoinPress: PropTypes.func.isRequired,
	updateActiveSlide: PropTypes.func.isRequired
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	header: {
		borderBottomWidth: 1,
		borderBottomColor: "#8888",
		width: "100%"

	},
	headerBalanceContainer: {
		flexDirection: "row",
	},
	headerBalance: {
		...systemWeights.regular,
		fontFamily: 'monospace',
		fontSize: 24,
		textAlign: "center",
		paddingTop: 3,
		paddingBottom: 3,
	},
	headerFiatSign: {
		...systemWeights.regular,
		fontSize: 10,
		textAlign: "center",
		paddingTop: 3,
		paddingBottom: 3,
	},
	headerText: {
		...systemWeights.thin,
		fontSize: 21,
		textAlign: "center"
	},
	innerContainer: {
		flex: 1,
		backgroundColor: "transparent",
		height: height * 1,
		width: width * 1,
		paddingHorizontal: width * 0.05
	},
	scrollViewContent: {
		alignItems: "center",
		justifyContent: "flex-start",
		margin: 6
	},
	deleteButton: {
		width: "100%",
		minHeight: 40,
		marginBottom: 35,
		borderRadius: 6,
		borderWidth: 1,
		backgroundColor: `${colors.danger}22`,
		borderColor: `${colors.danger}88`,
		alignItems: "center",
		justifyContent: "center"
	},
	text: {
		...systemWeights.semibold,
		fontSize: 18,
		textAlign: "center"
	}
});

//ComponentShouldNotUpdate
const WalletSliderEntry = memo(
	_WalletSliderEntry,
	(prevProps, nextProps) => {
		if (!prevProps || !nextProps) return true;
		return prevProps.wallet === nextProps.wallet &&
			prevProps.wallet.selectedWallet === nextProps.wallet.selectedWallet;
	}
);

export default WalletSliderEntry;
