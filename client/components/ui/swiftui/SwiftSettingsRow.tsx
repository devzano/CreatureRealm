// components/swiftui/SwiftSettingsRow.tsx
import React from 'react';
import {
  HStack,
  Text,
  Spacer,
  Switch,
  Image,
  Button,
  ImageProps,
} from '@expo/ui/swift-ui';
import {
  frame,
  background,
  clipShape,
} from '@expo/ui/swift-ui/modifiers';

type SwiftSettingsRowBaseProps = {
  iconName: ImageProps['systemName'];
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle?: string;
};

type SwiftSettingsToggleRowProps = SwiftSettingsRowBaseProps & {
  type: 'toggle';
  value: boolean;
  onChange: (val: boolean) => void;
};

type SwiftSettingsLinkRowProps = SwiftSettingsRowBaseProps & {
  type: 'link';
  onPress?: () => void;
};

export type SwiftSettingsRowProps =
  | SwiftSettingsToggleRowProps
  | SwiftSettingsLinkRowProps;

export function SwiftSettingsRow(
  props: SwiftSettingsRowProps
): React.ReactElement {
  const { iconName, iconColor, iconBackground, title, subtitle } = props;

  const content = (
    <HStack spacing={8}>
      <Image
        systemName={iconName}
        color={iconColor}
        size={18}
        modifiers={[
          frame({ width: 28, height: 28 }),
          background(iconBackground),
          clipShape('roundedRectangle'),
        ]}
      />
      <Text>{title}</Text>
      <Spacer />
      {subtitle && (
        <Text color="secondary" size={13}>
          {subtitle}
        </Text>
      )}
      {props.type === 'toggle' ? (
        <Switch
          value={props.value}
          onValueChange={props.onChange}
        />
      ) : null}
    </HStack>
  );

  if (props.type === 'link') {
    return (
      <Button onPress={props.onPress}>
        {content}
      </Button>
    );
  }

  return content;
}