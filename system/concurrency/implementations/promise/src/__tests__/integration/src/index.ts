import {
  Args_asyncBatchFetch,
  Args_batchFetch,
  Concurrent_Module,
  Concurrent_ReturnWhen,
  Concurrent_Task,
  FetchResult,
  HTTP_Module,
  HTTP_Response,
  HTTP_ResponseType,
  HTTP_UrlParam,
} from "./wrap";
import {
  serializegetArgs,
  deserializegetResult,
} from "./wrap/imported/HTTP_Module/serialization";

export function asyncBatchFetch(args: Args_asyncBatchFetch): FetchResult[] {
  const tasks: Concurrent_Task[] = [];
  for (let i = 0; i < args.delays.length; i++) {
    const param: HTTP_UrlParam[] = [
      {
        key: "seconds",
        value: args.delays[i],
      },
    ];
    const apiCall: ArrayBuffer = serializegetArgs({
      url: "https://hub.dummyapis.com/delay",
      request: {
        headers: [],
        urlParams: param,
        body: "",
        responseType: HTTP_ResponseType.TEXT,
      },
    });

    const task: Concurrent_Task = {
      uri: "wrap://ens/http.polywrap.eth",
      method: "get",
      args: apiCall,
    };
    tasks.push(task);
  }
  const taskIds: Array<i32> = Concurrent_Module.schedule({
    tasks: tasks,
  }).unwrap();

  const results = Concurrent_Module.result({
    taskIds: taskIds,
    returnWhen: Concurrent_ReturnWhen.ALL_COMPLETED,
  }).unwrap();

  const parsedResults: Array<FetchResult> = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i].result) {
      const parsed = deserializegetResult(results[i].result as ArrayBuffer);
      parsedResults.push({
        taskId: results[i].taskId,
        result: results[i].result,
        error: results[i].error,
        status: results[i].status,
        parsed: parsed,
      });
    } else {
      parsedResults.push({
        taskId: results[i].taskId,
        result: results[i].result,
        error: results[i].error,
        status: results[i].status,
        parsed: null,
      });
    }
  }

  return parsedResults;
}

export function batchFetch(args: Args_batchFetch): HTTP_Response[] {
  const results: HTTP_Response[] = [];
  for (let i = 0; i < args.delays.length; i++) {
    const param: HTTP_UrlParam[] = [
      {
        key: "seconds",
        value: args.delays[i],
      },
    ];
    const apiResult = HTTP_Module.get({
      url: "https://hub.dummyapis.com/delay",
      request: {
        headers: [],
        urlParams: param,
        body: "",
        responseType: HTTP_ResponseType.TEXT,
      },
    }).unwrap() as HTTP_Response;

    results.push(apiResult);
  }
  return results;
}
