import {
  Client,
  InvokeResult,
  msgpackEncode,
  PluginFactory,
} from "@polywrap/core-js";
import {
  Args_result,
  Args_schedule,
  Args_status,
  Int,
  Interface_ReturnWhenEnum,
  Interface_Task,
  Interface_TaskResult,
  Interface_TaskStatus,
  Interface_TaskStatusEnum,
  manifest,
  Module,
} from "./wrap";

export interface ConcurrentPromisePluginConfig extends Record<string, unknown> {
  cache?: Map<string, string>;
}

export class ConcurrentPromisePlugin extends Module<ConcurrentPromisePluginConfig> {
  private _totalTasks = 0;
  private _tasks: Record<number, Promise<InvokeResult>> = {};
  private _status: Record<number, Interface_TaskStatus> = {};

  constructor(config: ConcurrentPromisePluginConfig) {
    super(config);
  }

  public async result(
    input: Args_result,
    client: Client
  ): Promise<Array<Interface_TaskResult>> {
    switch (input.returnWhen) {
      case Interface_ReturnWhenEnum.FIRST_COMPLETED: {
        const result = await Promise.race(
          input.taskIds.map((id) => this.resolveTask(id))
        );
        return [result];
      }
      case Interface_ReturnWhenEnum.ALL_COMPLETED: {
        const results = await Promise.all(
          input.taskIds.map((id) => this.resolveTask(id))
        );
        return results;
      }
      default: {
        throw new Error("Not Implemented");
      }
    }
  }

  public async status(
    input: Args_status,
    client: Client
  ): Promise<Array<Interface_TaskStatus>> {
    return input.taskIds.map((id) => this._status[id]);
  }

  public schedule(input: Args_schedule, client: Client): Array<Int> {
    return input.tasks.map((task) => {
      const taskId = this.scheduleTask(
        {
          ...task,
        },
        client
      );
      return taskId;
    });
  }

  private scheduleTask(task: Interface_Task, client: Client): number {
    this._tasks[this._totalTasks] = client.invoke(task);
    this._status[this._totalTasks] = Interface_TaskStatusEnum.RUNNING;
    return this._totalTasks++;
  }

  private resolveTask(taskId: number): Promise<Interface_TaskResult> {
    return this._tasks[taskId]
      .then((result: InvokeResult) => {
        this._status[taskId] = Interface_TaskStatusEnum.COMPLETED;
        if (result.error) {
          return {
            taskId,
            result: undefined,
            error: result.error.message,
            status: Interface_TaskStatusEnum.FAILED,
          };
        }
        return {
          taskId: taskId,
          result: new Uint8Array(msgpackEncode(result.data)),
          error: undefined,
          status: Interface_TaskStatusEnum.COMPLETED,
        };
      })
      .catch((err) => {
        this._status[taskId] = Interface_TaskStatusEnum.FAILED;
        return {
          taskId: taskId,
          result: undefined,
          error: err.message as string,
          status: Interface_TaskStatusEnum.FAILED,
        };
      });
  }
}

export const concurrentPromisePlugin: PluginFactory<
  ConcurrentPromisePluginConfig
> = (config: ConcurrentPromisePluginConfig) => {
  return {
    factory: () => new ConcurrentPromisePlugin(config),
    manifest: manifest,
  };
};

export const plugin = concurrentPromisePlugin;
