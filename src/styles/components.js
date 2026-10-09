import styled from "styled-components";
import {themes} from "./themes";
import _LinearGradient from "react-native-linear-gradient";
import _QRCode from 'react-native-qrcode-svg';
import _EvilIcon from "react-native-vector-icons/EvilIcons";
import _FontAwesome from "react-native-vector-icons/FontAwesome";
import _FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import _MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import _MaterialIcons from "react-native-vector-icons/MaterialIcons";
import _Fontisto from "react-native-vector-icons/Fontisto";
import _Foundation from "react-native-vector-icons/Foundation";
import _Ionicons from "react-native-vector-icons/Ionicons";
/**********************
General styles
 **********************/
export const LinearGradient = styled(_LinearGradient).attrs((props) => ({
	colors: themes[props.theme.mode].gradient
}))`
  flex: 1
`;

export const View = styled.View`
  ${props => props.borderColor ? `border-color: ${props.theme[props.borderColor]}` : null};
`;

export const ScrollView = styled.ScrollView`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.background};
`;

export const Text = styled.Text`
  color: ${props => props.theme.text};
`;

export const TouchableOpacity = styled.TouchableOpacity`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.text};
  border-color: ${props => props.borderColor ? props.theme[props.borderColor] : props.theme.text}
`;

export const TouchableHighlight = styled.TouchableHighlight`
  background-color: ${props => props.type ? props.theme[props.type] : props.theme.text};
  border-color: ${props => props.theme.text};
`;

export const TextInput = styled.TextInput.attrs((props) => ({
	placeholderTextColor: props.theme.muted,
	keyboardAppearance: props.theme.mode === "light" ? "light" : "dark"
}))`
  background-color: ${props => props.editable === false ? props.theme.muted : props.theme.shadow};
  color: ${props => props.theme.text};
  border-color: ${props => props.theme.text};
`;

export const EvilIcon = styled(_EvilIcon).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const FontAwesome = styled(_FontAwesome).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const FontAwesome5 = styled(_FontAwesome5).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const MaterialCommunityIcons = styled(_MaterialCommunityIcons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const MaterialIcons = styled(_MaterialIcons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Fontisto = styled(_Fontisto).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Foundation = styled(_Foundation).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const Ionicons = styled(_Ionicons).attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

export const ActivityIndicator = styled.ActivityIndicator.attrs((props) => ({
	color: props.type ? props.theme[props.type] : props.theme.text
}))`
`;

/**********************
Component-specific styles
 **********************/
export const XButton = styled.View`
  background-color: ${props => props.theme.background};
  border-color: ${props => props.theme.text};
  border-width: ${props => props.theme.mode === "light" ? "1.5px" : "1.5px"};
`;

export const QRCode = styled(_QRCode).attrs(() => ({
  color: "#000"
}))`
`;

export const CopiedLinearGradient = styled(_LinearGradient).attrs((props) => ({
	colors: props.theme.gradient
}))`
  flex: 1;
  border-color: ${props => props.theme.white};
`;
