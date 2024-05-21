const path = require('path');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');
const env = require('env-var')

async function run() {
  try {
    // Get inputs
    const taskDefinitionFile = core.getInput('task-definition', { required: true });
    const containerName = core.getInput('container-name', { required: true });
    const imageURI = core.getInput('image', { required: true });
    const logGroup = core.getInput('log-group', { required: false });
    const serviceFamily = core.getInput('service-family', { required: false });
    let envList = core.getInput('env-list', { required: false });
    console.log(envList)
    if (envList) {
      envList = JSON.parse(envList)
    }
    console.log(envList)

    // Parse the task definition
    const taskDefPath = path.isAbsolute(taskDefinitionFile) ?
      taskDefinitionFile :
      path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFile);
    if (!fs.existsSync(taskDefPath)) {
      throw new Error(`Task definition file does not exist: ${taskDefinitionFile}`);
    }
    const taskDefContents = require(taskDefPath);

    // Insert the image URI
    if (!Array.isArray(taskDefContents.containerDefinitions)) {
      throw new Error('Invalid task definition format: containerDefinitions section is not present or is not an array');
    }
    const containerDef = taskDefContents.containerDefinitions.find(function (element) {
      return element.name == containerName;
    });
    if (!containerDef) {
      throw new Error('Invalid task definition: Could not find container definition with matching name');
    }
    containerDef.image = imageURI;
    if (logGroup) {
      containerDef.logConfiguration.options["awslogs-group"] = logGroup;
    }

    if (envList) {
      const environmentMap = new Map(containerDef.environment.map(e => [e.name, e.value]))

      envList.forEach(variable => {
        console.log(variable)
        try {
          environmentMap.set(variable, env.get(variable).required().asString())
        } catch (e) {
          console.log(e)
        }
      })

      containerDef.environment = Array.from(environmentMap.entries()).map(([name, value]) => ({ name, value }))
      console.log(containerDef.environment)
    } else {
      containerDef.environment = containerDef.environment.map(object => ({
        name: object.name,
        value: env.get(object.name).required(false).asString() || object.value
      }))
    }
    console.log(containerDef.environment);
    if (serviceFamily) {
      taskDefContents.family = serviceFamily;
    }

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      tmpdir: process.env.RUNNER_TEMP,
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
    core.setOutput('task-definition', updatedTaskDefFile.name);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
