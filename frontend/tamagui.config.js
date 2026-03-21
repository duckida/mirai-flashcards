const { config } = require('@tamagui/config/v3')
const { createTamagui } = require('@tamagui/core')

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
      successLight: '#D1FAE5', // alias for successBackground
      warning: '#F59E0B',
      warningBackground: '#FEF3C7',
      warningLight: '#FEF3C7', // alias for warningBackground
      error: '#EF4444',
      errorBackground: '#FEE2E2',
      errorLight: '#FEE2E2', // alias for errorBackground
      
      // Blue accent (for speech indicators)
      blue: '#3B82F6',
      blueBackground: '#DBEAFE',
      
      // Shadow colors
      shadowColor: 'rgba(0,0,0,0.1)',
      shadowColorHover: 'rgba(0,0,0,0.15)',
      shadowColorPress: 'rgba(0,0,0,0.2)',
    },
    
    // Dark theme (for future dark mode support)
    dark: {
      ...config.themes.dark,
      
      // Primary purple colors
      primary: '#A855F7',
      primaryHover: '#C084FC',
      primaryPress: '#9333EA',
      primaryFocus: '#A855F7',
      
      // Background colors
      background: '#111827',
      backgroundHover: '#1F2937',
      backgroundPress: '#374151',
      backgroundFocus: '#1F2937',
      backgroundStrong: '#374151',
      backgroundTransparent: 'rgba(0,0,0,0)',
      
      // Card backgrounds
      cardBackground: '#1F2937',
      cardBackgroundHover: '#374151',
      cardBackgroundPress: '#4B5563',
      
      // Text colors
      color: '#F9FAFB',
      colorHover: '#F9FAFB',
      colorPress: '#F9FAFB',
      colorFocus: '#F9FAFB',
      colorTransparent: 'rgba(0,0,0,0)',
      
      // Secondary text
      placeholderColor: '#6B7280',
      
      // Border colors
      borderColor: '#374151',
      borderColorHover: '#4B5563',
      borderColorPress: '#6B7280',
      borderColorFocus: '#A855F7',
      
      // Purple accent variations
      purple: '#A855F7',
      purple1: '#581C87',
      purple2: '#6B21A8',
      purple3: '#7E22CE',
      purple4: '#9333EA',
      purple5: '#A855F7',
      purple6: '#C084FC',
      purple7: '#D8B4FE',
      purple8: '#E9D5FF',
      purple9: '#F3E8FF',
      purple10: '#FAF5FF',
      
      // Success, warning, error colors
      success: '#10B981',
      successBackground: '#064E3B',
      successLight: '#064E3B',
      warning: '#F59E0B',
      warningBackground: '#78350F',
      warningLight: '#78350F',
      error: '#EF4444',
      errorBackground: '#7F1D1D',
      errorLight: '#7F1D1D',
      
      // Blue accent
      blue: '#60A5FA',
      blueBackground: '#1E3A5F',
      
      // Shadow colors
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowColorHover: 'rgba(0,0,0,0.4)',
      shadowColorPress: 'rgba(0,0,0,0.5)',
    },
  },
})

module.exports = tamaguiConfig
