import { config } from '@tamagui/config/v3'
import { createTamagui } from '@tamagui/core'

const tamaguiConfig = createTamagui({
  ...config,
  
  // Custom tokens for design system
  tokens: {
    ...config.tokens,
    
    // Purple accent color palette
    color: {
      ...config.tokens.color,
      purple50: '#FAF5FF',
      purple100: '#F3E8FF',
      purple200: '#E9D5FF',
      purple300: '#D8B4FE',
      purple400: '#C084FC',
      purple500: '#A855F7',
      purple600: '#9333EA',
      purple700: '#7E22CE',
      purple800: '#6B21A8',
      purple900: '#581C87',
      
      // Semantic colors
      primary: '#9333EA',
      primaryLight: '#A855F7',
      primaryDark: '#7E22CE',
      
      // Backgrounds
      background: '#FFFFFF',
      backgroundHover: '#F9FAFB',
      backgroundPress: '#F3F4F6',
      
      // Text colors
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      
      // Border colors
      borderLight: '#E5E7EB',
      borderMedium: '#D1D5DB',
      borderDark: '#9CA3AF',
    },
    
    // Modern rounded radius tokens
    radius: {
      ...config.tokens.radius,
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      round: 9999,
    },
    
    // Consistent spacing tokens
    space: {
      ...config.tokens.space,
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 36,
      10: 40,
      12: 48,
      16: 64,
      20: 80,
    },
    
    // Size tokens for consistent dimensions
    size: {
      ...config.tokens.size,
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 36,
      10: 40,
      12: 48,
      16: 64,
      20: 80,
      24: 96,
      32: 128,
      40: 160,
      48: 192,
      56: 224,
      64: 256,
    },
  },
  
  // Custom theme with purple accent
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      
      // Primary purple colors
      primary: '#9333EA',
      primaryHover: '#A855F7',
      primaryPress: '#7E22CE',
      primaryFocus: '#9333EA',
      
      // Background colors
      background: '#FFFFFF',
      backgroundHover: '#F9FAFB',
      backgroundPress: '#F3F4F6',
      backgroundFocus: '#F9FAFB',
      backgroundStrong: '#F3F4F6',
      backgroundTransparent: 'rgba(0,0,0,0)',
      
      // Card backgrounds
      cardBackground: '#FFFFFF',
      cardBackgroundHover: '#FAFAFA',
      cardBackgroundPress: '#F5F5F5',
      
      // Text colors
      color: '#111827',
      colorHover: '#111827',
      colorPress: '#111827',
      colorFocus: '#111827',
      colorTransparent: 'rgba(0,0,0,0)',
      
      // Secondary text
      placeholderColor: '#9CA3AF',
      
      // Border colors
      borderColor: '#E5E7EB',
      borderColorHover: '#D1D5DB',
      borderColorPress: '#9CA3AF',
      borderColorFocus: '#9333EA',
      
      // Purple accent variations
      purple: '#9333EA',
      purple1: '#FAF5FF',
      purple2: '#F3E8FF',
      purple3: '#E9D5FF',
      purple4: '#D8B4FE',
      purple5: '#C084FC',
      purple6: '#A855F7',
      purple7: '#9333EA',
      purple8: '#7E22CE',
      purple9: '#6B21A8',
      purple10: '#581C87',
      
      // Success, warning, error colors
      success: '#10B981',
      successBackground: '#D1FAE5',
      warning: '#F59E0B',
      warningBackground: '#FEF3C7',
      error: '#EF4444',
      errorBackground: '#FEE2E2',
      
      // Shadow colors
      shadowColor: 'rgba(0,0,0,0.1)',
      shadowColorHover: 'rgba(0,0,0,0.15)',
      shadowColorPress: 'rgba(0,0,0,0.2)',
    },
  },
})

export default tamaguiConfig

export type Conf = typeof tamaguiConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
