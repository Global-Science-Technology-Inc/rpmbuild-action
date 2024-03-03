import * as core from '@actions/core';
//import github from '@actions/github';
import * as exec from '@actions/exec';
//import io from '@actions/io';
import cp from 'child_process';
import fs from 'fs';
import path from 'path';

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

function makeLabel(label: string): string {
  return `%${label}`;
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug('Starting rpmbuild-action');

    // get inputs from workflow
    // specFile name
    const configPath = core.getInput('spec_file'); // user input, eg: `foo.spec' or `rpm/foo.spec'
    const workspacePath = core.getInput('workspace_path');
    const basename = path.basename(configPath); // always just `foo.spec`
    core.debug(configPath);
    core.debug(basename);
    core.debug(`path: [${configPath}]  spec: [${basename}]`);
    const specFile = {
      srcFullPath: `${workspacePath}/workspace/${configPath}`,
      destFullPath: `${workspacePath}/home/rpmbuild/SPECS/${basename}`
    };

    // Read spec file and get values
    const data = fs.readFileSync(specFile.srcFullPath, 'utf8');
    let name = '';
    let version = '';
    const alias = {};

    for (const line of data.split('\n')) {
      const lineArray = line.split(/[ ]+/);
      if (lineArray[0].includes('define')) {
        const label = makeLabel(lineArray[1]);
        alias[label] = lineArray[2];
        core.debug(`define ${lineArray[1]} = [${lineArray[2]}]`);
      }
      if (lineArray[0].includes('Name')) {
        name = name + lineArray[1];
      }
      if (lineArray[0].includes('Version')) {
        version = version + lineArray[1];
      }
    }
    if (name.startsWith('%')) {
      core.debug(`looking up [${name}]`);
      name = alias[name];
    }
    if (version.startsWith('%')) {
      core.debug(`looking up [${version}]`);
      version = alias[version];
    }
    core.debug(`name: ${name}`);
    core.debug(`version: ${version}`);

    // setup rpm tree
    await exec.exec('rpmdev-setuptree');

    // Copy spec file from path specFile to ${workspacePath}/home/rpmbuild/SPECS/
    await exec.exec(`cp ${specFile.srcFullPath} ${specFile.destFullPath}`);

    const tarball = `${name}-${version}.tar.gz`;

    // Make the code in ${workspacePath}/workspace/ into a tar.gz, located in ${workspacePath}/home/rpmbuild/SOURCES/
    if (fs.existsSync(`${workspacePath}/workspace/${tarball}`)) {
      core.debug(`tarball [${tarball}] exists... copying...`);
      await exec.exec(`cp ${tarball} ${workspacePath}/home/rpmbuild/SOURCES`);
    } else {
      core.debug(`building tarball [${tarball}] from git archive...`);
      const oldGitDir = process.env.GIT_DIR;
      process.env.GIT_DIR = '${workspacePath}/workspace/.git';
      await exec.exec(
        `git archive --output=${workspacePath}/home/rpmbuild/SOURCES/${tarball} --prefix=${name}-${version}/ HEAD`
      );
      process.env.GIT_DIR = oldGitDir;
    }

    // Verify source tarball is created
    await exec.exec(`ls ${workspacePath}/home/rpmbuild/SOURCES`);

    // Execute rpmbuild , -ba generates both RPMS and SPRMS
    try {
      await exec.exec(`rpmbuild -ba ${specFile.destFullPath}`);
    } catch (err) {
      core.error(`action failed with error: ${err}`);
      core.setFailed(`action failed with error: ${err}`);
    }

    // Verify RPM is created
    await exec.exec(`ls ${workspacePath}/home/rpmbuild/RPMS`);

    // setOutput rpm_path to /root/rpmbuild/RPMS , to be consumed by other actions like
    // actions/upload-release-asset

    // Get source rpm name , to provide file name, path as output
    let myOutput = '';
    cp.exec(
      `ls ${workspacePath}/home/rpmbuild/SRPMS/`,
      (err, stdout, stderr) => {
        if (err) {
          //some err occurred
          core.error(err);
        } else {
          // the *entire* stdout and stderr (buffered)
          core.debug(`stdout: ${stdout}`);
          myOutput = myOutput + `${stdout}`.trim();
          core.debug(`stderr: ${stderr}`);
        }
      }
    );

    // only contents of workspace can be changed by actions and used by subsequent actions
    // So copy all generated rpms into workspace , and publish output path relative to workspace (${workspacePath}/workspace)
    await exec.exec(`mkdir -p rpmbuild/SRPMS`);
    await exec.exec(`mkdir -p rpmbuild/RPMS`);

    await exec.exec(
      `cp ${workspacePath}/home/rpmbuild/SRPMS/${myOutput} rpmbuild/SRPMS`
    );
    // Not sure why this was using cp (child_process)
    await exec.exec(`cp -R ${workspacePath}/home/rpmbuild/RPMS/. rpmbuild/RPMS/`);

    await exec.exec(`ls -la rpmbuild/SRPMS`);
    await exec.exec(`ls -la rpmbuild/RPMS`);

    // set outputs to path relative to workspace ex ./rpmbuild/
    core.setOutput('source_rpm_dir_path', `rpmbuild/SRPMS/`); // path to  SRPMS directory
    core.setOutput('source_rpm_path', `rpmbuild/SRPMS/${myOutput}`); // path to Source RPM file
    core.setOutput('source_rpm_name', `${myOutput}`); // name of Source RPM file
    core.setOutput('rpm_dir_path', `rpmbuild/RPMS/`); // path to RPMS directory
    core.setOutput('rpm_content_type', 'application/octet-stream'); // Content-type for Upload
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.debug(error.message);
      core.setFailed(error.message);
    }else {
      const msg: string = getErrorMessage(error);
      core.debug(msg);
      core.setFailed(msg);
    }
  }
}

run();
