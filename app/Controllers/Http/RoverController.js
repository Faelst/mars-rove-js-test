"use strict";

const Rover = require("../../Services/Rover");
const Validations = require("./Helpers/Validations");
const SplitInstructions = require("./Helpers/SplitInstructions");
const dayjs = require("dayjs");

const RoverLogsModel = use("App/Models/RoverLogs");
const { validateAll } = use("Validator");
const Event = use("Event");

class RoverController {
  constructor() {
    this.validations = new Validations();
    this.splitInstructions = new SplitInstructions();
  }

  async move({ request, response }) {
    const validate = await validateAll(request.all(), {
      coordinates: "required",
      instructions: "required",
    });

    if (validate.fails()) {
      return response.status(400).json({
        message: "Invalid request",
        errors: validate.messages(),
      });
    }

    const { coordinates, instructions: instructionsString } = request.all();

    if (!coordinates.x || !coordinates.y || !coordinates.direction) {
      return response.status(400).send({ error: "Invalid coordinates" });
    }

    if (this.validations.isInvalidInstruction(instructionsString)) {
      return response.status(400).send({ error: "Invalid instructions" });
    }

    const instructions = new SplitInstructions(instructionsString).get();

    if (!this.validations.isValidPosition(coordinates)) {
      return response.status(400).send({ error: "Invalid Position" });
    }

    const rover = new Rover(coordinates);

    const result = rover.sendCommands(instructions);

    Event.fire("new:rover", {
      result,
      coordinates,
      instructions: instructionsString,
    });

    return response.status(200).send({
      result,
      formattedResult: `${result.x} ${result.y} ${result.direction}`,
    });
  }

  async getLogs({ response }) {
    const logs = await RoverLogsModel.query().fetch();

    return response.status(200).send(logs);
  }

  async showLogs({ view, response }) {
    const data = await RoverLogsModel.query().fetch();

    const logs = data.toJSON().map((log) => ({
      ...log,
      inicialPosition: `${log.rover_x} ${log.rover_y} ${log.rover_direction}`,
      commands: log.rover_commands,
      finalPosition: `${log.rover_final_x} ${log.rover_final_y} ${log.rover_final_direction}`,
      createDate: dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss"),
    }));

    return view.render("logs", { logs: logs });
  }
}

module.exports = RoverController;
