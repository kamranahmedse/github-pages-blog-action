const {info, error} = require('@actions/core');
const {configureRepo} = require('./git');
const {prepareTheme} = require('./theme');
const {deploy} = require('./deploy');

async function run(configuration) {
    info('Checking configuration and starting deployment');

    try {
        await configureRepo(configuration);
    } catch (e) {
        throw new Error(`There was an error initializing the repository: ${e.message}`)
    }

    await prepareTheme(configuration);
    await deploy(configuration);
}

module.exports = {
    run
}
