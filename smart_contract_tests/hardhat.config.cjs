require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  compilers: [
    {
        version: "0.8.18",
        settings: {
            optimizer: {
                enabled: true,
                runs: 999999
            }
        }
    },
  ],
  paths: {
    sources: './tmp/contracts',
    artifacts: './tmp/artifacts',
    cache: './tmp/cache',
  },
};
