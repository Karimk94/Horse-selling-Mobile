import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params, attempts = 12) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
    return;
  }

  if (attempts > 0) {
    setTimeout(() => navigate(name, params, attempts - 1), 150);
  }
}

export function openAuthStack(attempts = 12) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('AuthStack', { screen: 'Login' });
    return;
  }

  if (attempts > 0) {
    setTimeout(() => openAuthStack(attempts - 1), 150);
  }
}
