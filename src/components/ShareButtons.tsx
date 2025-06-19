import React, {useState, memo} from "react";
import {
    StyleSheet,
    Animated,
    Share,
    Easing,
    Dimensions,
    PixelRatio
} from "react-native";
import PropTypes from "prop-types";
import {systemWeights} from "react-native-typography";
import Button from "./Button";
import {Text, View, CopiedLinearGradient} from "../styles/components";
import Clipboard from "@react-native-clipboard/clipboard";

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get('window');

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

export function normalize(size) {
  const newSize = size * scale 
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize))
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
  }
}

interface ShareButtonsComponent {
    text: string,
    shareMessage?: string,
    shareUrl?: string,
    shareTitle?: string,
    shareDialogTitle?: string, //Android Only
    onCopySuccessText?: string,
    disabled?: boolean,
    textContainerStyle?: object
}

const _ShareButtons = (
    {
        text = "",
        path = "",
        shareMessage = "",
        shareUrl = "google.com",
        shareTitle = "",
        shareDialogTitle = "", //Android Only
        onCopySuccessText = "Copied!",
        disabled = false,
        textContainerStyle = {},
        cryptoCurrency
    }: ShareButtonsComponent) => {
    const [textOpacity] = useState(new Animated.Value(0));

    const onSharePress = (): void => {
        try {
            Share.share({
                message: shareMessage,
                url: shareUrl,
                title: shareTitle
            }, {
                dialogTitle: shareDialogTitle // Android only
            });
        } catch (e) {
            console.log(e);
        }
    };


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

    const onCopyPress = () => {
        let duration = 1500;
        try {
            Clipboard.setString(text);
            Animated.timing(
                textOpacity,
                {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }
            ).start(async () => {
                setTimeout(() => {
                    Animated.timing(
                        textOpacity,
                        {
                            toValue: 0,
                            duration,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true
                        }
                    ).start();
                }, duration / 4);
            });
        } catch (e) {
            console.log(e);
            alert("Unable to copy item to clipboard. Please try again or check your phone's permissions.");
        }
    };

    return (
        <View type="transparent" style={[{width: "100%"}]}>
            <View style={[styles.textContainer, textContainerStyle]}>
    

                <Text style={styles.text}>{firstHalf(text)}</Text>
                <Text style={styles.text}>{secondHalf(text)}</Text>
                <Text style={styles.subText}>{path}</Text>

                <Animated.View style={[styles.copiedContainer, {opacity: textOpacity}]}>
                    <CopiedLinearGradient
                        style={[textContainerStyle, {flex: 1, borderRadius: 5}]}
                        start={{x: 0.0, y: 0.0}} end={{x: 1.0, y: 1.0}}
                    >
                        <View type="transparent" style={styles.copied}>
                            <Text style={styles.copiedText}>{onCopySuccessText}</Text>
                        </View>
                    </CopiedLinearGradient>
                </Animated.View>

            </View>
            <View style={styles.row}>
                <Button style={styles.button} text="Share" onPress={onSharePress} disabled={!text || disabled} />
                <View style={{marginHorizontal: 5}} />
                <Button style={styles.button} text="Copy" onPress={onCopyPress} disabled={!text || disabled} />
            </View>
        </View>
    );
};

_ShareButtons.propTypes = {
    text: PropTypes.string.isRequired,
    shareMessage: PropTypes.string,
    shareUrl: PropTypes.string,
    shareTitle: PropTypes.string,
    shareDialogTitle: PropTypes.string,
    onCopySuccessText: PropTypes.string,
    disabled: PropTypes.bool
};

const styles = StyleSheet.create({
    textContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
        padding: 6,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: "#fff2",
        backgroundColor: "#7772"
    },
    text: {
        ...systemWeights.light,
        fontSize: normalize(16),
        textAlign: "center",
        fontFamily: 'monospace' 

    },
    subText: {
        ...systemWeights.light,
        fontSize: normalize(12),
        textAlign: "center",
        fontFamily: 'monospace',
        backgroundColor: "transparent"
    },
    copiedContainer: {
        flex: 1,
        position: "absolute",
        left: -2,
        top: -2,
        bottom: -2,
        right: -2
    },
    copied: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    copiedText: {
        ...systemWeights.bold,
        fontSize: normalize(16),
        textAlign: "center"
    },
    button: {
        minWidth: "20%",
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(6),
    },
    row: {
        marginTop: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent"
    },
    header: {
        backgroundColor: "transparent",
        textAlign: "center",
        ...systemWeights.semibold,
        marginTop: 15,
        fontSize:normalize(24)
    },
});

//ComponentShouldNotUpdate
const ShareButtons = memo(
    _ShareButtons,
    (prevProps, nextProps) => {
        if (!prevProps || !nextProps) return true;
        return nextProps === prevProps;
    }
);
export default ShareButtons;
