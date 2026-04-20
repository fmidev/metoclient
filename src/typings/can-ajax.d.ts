declare module 'can-ajax' {
  interface AjaxResponse {
    responseText: string;
    requestURL: string;
    [key: string]: unknown;
  }

  interface AjaxOptions {
    url: string;
    crossDomain?: boolean;
    contentType?: string;
    beforeSend?: (jqxhr: AjaxResponse) => void;
  }

  function ajax(options: AjaxOptions): Promise<AjaxResponse>;
  export default ajax;
}
