module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
  ],
  plugins: [
    [
      '@tamagui/babel-plugin',
      {
        components: ['@tamagui/core'],
        config: './tamagui.config.js',
      },
    ],
  ],
}
