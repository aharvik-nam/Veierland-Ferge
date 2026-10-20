import { Capacitor } from '@capacitor/core';

// Kjører appen som installert app fra App Store / Google Play (Capacitor)?
export const isNative = Capacitor.isNativePlatform();

// I den native appen serveres filene lokalt, så server-API-ene må nås på full adresse
export const API_BASE = isNative ? 'https://veierland-ferge.vercel.app' : '';
