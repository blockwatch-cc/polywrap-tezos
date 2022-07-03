import { JSON } from "@web3api/wasm-as";
import {
  Http_Query,
  Http_ResponseType
} from "./w3";

export function testHttpPlugin(): string {
  const photoUrl =  fetchPhotoUrl();
  const photoContent = fetchPhotoContent(photoUrl);
  const newPost = createNewPost();

  return `createNewPost: ${newPost} fetchPhotoUrl: ${photoUrl} fetchPhotoContent: ${photoContent}`;
}

/**
 * Helper method to create new post.
 * 
 * This method performs http post operation using http plugin and verifies 
 * the response content.
 */
function createNewPost() : string {
  const newPostTitle = "NewPostTitle";
  const newPostBody = "NewPostBody  line1 line2";
  const newPostUserId = 1;

  const postPayload = JSON.Value.Object();
  postPayload.set("title", newPostTitle);
  postPayload.set("body", newPostBody);
  postPayload.set("userId", newPostUserId);

  const response = Http_Query.post({
    url: "https://jsonplaceholder.typicode.com/posts",
    request: {
      responseType: Http_ResponseType.TEXT,
      headers:[{
        key: "user-agent",
        value: "HttpDemo"
      }, {
        key: 'Content-type',
        value: 'application/json; charset=UTF-8'
      }],
      urlParams: [{
        key: "dummyQueryParam",
        value: "20"
      }],
      body: postPayload.toString()
    }
  }).unwrap();

  if (!response) {
    return "ERROR_NO_RESPONSE: createNewPost";
  }

  // Extract values from response json body.
  // We expect id, title, body, userId 
  const result = JSON.parse(response.body || "");

  if (!result.isObj) {
    return "ERROR_BAD_RESP_BODY: createNewPost";
  }

  const obj = result as JSON.Obj;
  const title = obj.getString("title")!.valueOf();
  const body = obj.getString("body")!.valueOf();
  const id = obj.getInteger("id")!.valueOf().toString();

  return `{ title: "${title}", body: "${body}", id: ${id}}`;
}

/**
 * Helper method to fetch binary content using http plugin.
 * 
 * @param photoUrl photo url.
 */
function fetchPhotoContent(photoUrl: string) : string {
  const response = Http_Query.get({
    url: photoUrl,
    request: {
      responseType: Http_ResponseType.BINARY,
      headers: [{
        key: "user-agent",
        value: "HttpDemo"
      }],
      urlParams: [{
        key: "dummyQueryParam",
        value: "20"
      }],
      body: ""
    }
  }).unwrap();

  // Binary response is base64 encoded and represented in this string. 
  return response!.body!;
}

/**
 * Helper method to fetch text content using http plugin.
 *
 * @returns photo url.  
 */
function fetchPhotoUrl() : string {
  const photosFeedUrl = "https://jsonplaceholder.typicode.com/photos/1";
  const response = Http_Query.get({
    url: photosFeedUrl,
    request: {
      responseType: Http_ResponseType.TEXT,
      headers: [{
        key: "user-agent",
        value: "HttpDemo"
      }],
      urlParams: [{
        key: "dummyQueryParam",
        value: "20"
      }],
      body: ""
    }
  }).unwrap();

  const jsonResponse = JSON.parse(response!.body) as JSON.Obj;
  return jsonResponse.getString("url")!.toString();
}
