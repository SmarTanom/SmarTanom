# SmarTanom Mobile

React Native (Expo) client for SmarTanom.

## Fonts: Montserrat

We use Montserrat (400/600/700). Install and load with expo-font:

```
expo install expo-font @expo-google-fonts/montserrat
```

Then load in `App.js`:

```tsx
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

const [fontsLoaded] = useFonts({
	Montserrat_400Regular,
	Montserrat_600SemiBold,
	Montserrat_700Bold,
});
```

Apply globally using `fontFamily` in styles.
