// The app's entry: the home-screen widget's background handler, then Expo Router. The widget comes first and
// stays light, because Android can start this with the app closed and nothing else may be needed.
import './src/widget/register';
import 'expo-router/entry';
