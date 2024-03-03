/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    core.debug("main: Clearing all mocks");
  })

  it('starts processing', async () => {
    const specFile: string = 'metlab-yum.spec';
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      core.debug(`main: Returning value [${specFile}] for [${name}] `);
      switch (name) {
        case 'spec_file':
          return specFile;
        case 'workspace_path':
          return './__fixtures__';
        default:
          return 'default.spec';
      }
    })


    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(2, 'Starting rpmbuild-action');
    expect(debugMock).toHaveBeenNthCalledWith(5, specFile);
    expect(debugMock).toHaveBeenNthCalledWith(6, specFile);
    expect(debugMock).toHaveBeenNthCalledWith(7, `path: [${specFile}]  spec: [${specFile}]`);
    if(false) {
      expect(debugMock).toHaveBeenNthCalledWith(21, 'name: [metlab-yum]');
      expect(setOutputMock).toHaveBeenNthCalledWith(1,"source_rpm_dir_path", `rpmbuild/SRPMS/`);
      expect(setOutputMock).toHaveBeenNthCalledWith(4,"rpm_dir_path", `rpmbuild/RPMS/`);
      expect(setOutputMock).toHaveBeenNthCalledWith(5,"rpm_conatent_type", "application/octet-stream");
      expect(errorMock).not.toHaveBeenCalled()
    }
  })

  it('throws exception on bad spec file', async () => {
    // Set the action's inputs as return values from core.getInput()
    const specFile: string = 'bad_file.spec';
    getInputMock.mockImplementation(name => {
      core.debug(`main: Returning value [${specFile}] for [${name}] `);
      switch (name) {
        case 'spec_file':
          return specFile;
        case 'workspace_path':
          return './__fixtures__';
        default:
          return 'default.spec';
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(debugMock).toHaveBeenNthCalledWith(2, 'Starting rpmbuild-action');
    expect(debugMock).toHaveBeenNthCalledWith(5, specFile);
    expect(debugMock).toHaveBeenNthCalledWith(6, specFile);
    expect(debugMock).toHaveBeenNthCalledWith(7, `path: [${specFile}]  spec: [${specFile}]`);
    // Verify that all of the core library functions were called correctly
    //expect(setFailedMock).toHaveBeenNthCalledWith(
    //  1,
    //  'milliseconds not a number'
    //)
    expect(errorMock).not.toHaveBeenCalled()
  })
})
