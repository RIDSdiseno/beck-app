import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

type BeckLogoProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const xml = `
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#FFFFFF" />
  <rect x="70" y="60" width="260" height="10" fill="#D62828" />
  <text x="200" y="135" text-anchor="middle" font-family="Montserrat, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="64" fill="#111111">BECK</text>
  <rect x="90" y="155" width="220" height="6" fill="#555555" />
  <text x="200" y="190" text-anchor="middle" font-family="Montserrat, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="500" font-size="18" letter-spacing="4" fill="#666666">SOLUCIONES</text>
</svg>
`;

export const BeckLogo: React.FC<BeckLogoProps> = ({
  width = 220,
  height = 180,
  style,
}) => {
  return (
    <SvgXml
      xml={xml}
      width={width}
      height={height}
      style={style}
      accessibilityRole="image"
      accessibilityLabel="Beck CRM logo"
    />
  );
};
