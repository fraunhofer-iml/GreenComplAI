class Util {

    public static base64UrlEncode(str: string): string {
        // UTF-8 String in Uint8Array kodieren
        const utf8Bytes = new TextEncoder().encode(str);
        // Uint8Array zu Base64 konvertieren
        let base64 = btoa(String.fromCharCode(...Array.from(utf8Bytes)));
        // Base64 in Base64-URL konformes Format umwandeln
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}

export default Util;
