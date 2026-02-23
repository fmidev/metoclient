declare module 'can-ajax' {
  interface AjaxOptions {
    url: string;
    crossDomain?: boolean;
    contentType?: string;
    beforeSend?: (jqxhr: AjaxResponse) => void;
  }

  interface AjaxResponse {
    responseText: string;
    requestURL: string;
    [key: string]: unknown;
  }

  function ajax(options: AjaxOptions): Promise<AjaxResponse>;
  export default ajax;
}
