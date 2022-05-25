const {exec} = require('@actions/exec');
const buffer = require('buffer');


const output = {stdout: '', stderr: ''};

/**
 * Wrapper around the GitHub toolkit exec command which returns the output.
 * Also allows you to easily toggle the current working directory.
 *
 * @param {string} cmd - The command to execute.
 * @param {string} cwd - The current working directory.
 * @param {boolean} silent - Determines if the in/out should be silenced or not.
 * @param {boolean} ignoreReturnCode - Determines whether to throw an error
 * on a non-zero exit status or to leave implementation up to the caller.
 */
async function execute(
    cmd,
    cwd,
    silent = false,
    ignoreReturnCode = false
) {
    output.stdout = ''
    output.stderr = ''

    await exec(cmd, [], {
        // Silences the input unless the INPUT_DEBUG flag is set.
        silent,
        cwd,
        listeners: {
            stdout,
            stderr
        },
        ignoreReturnCode
    })

    return Promise.resolve(output)
}

function stdout(data) {
    const dataString = data.toString().trim()
    if (
        output.stdout.length + dataString.length <
        buffer.constants.MAX_STRING_LENGTH
    ) {
        output.stdout += dataString
    }
}

function stderr(data) {
    const dataString = data.toString().trim()
    if (
        output.stderr.length + dataString.length <
        buffer.constants.MAX_STRING_LENGTH
    ) {
        output.stderr += dataString
    }
}

module.exports = {
    execute,
    stdout,
    stderr
};
