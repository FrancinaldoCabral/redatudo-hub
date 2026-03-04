

export function errorToText(error: any): string {
  try {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      let messageText = `Error response: 
      status: ${error.response.status}
      data: ${JSON.stringify(error.response.data)}
      `
      return messageText
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      let messageText = `Error request: 
      Request: ${JSON.stringify(error.request)}
      `
      return messageText
    } else {
      // Something happened in setting up the request that triggered an Error
      let messageText = `Error message: 
      Message: ${JSON.stringify(error.message)}
      `
      return messageText
    }
  } catch (error) {
    return
  }
}