package com.example.agritech_finance_api;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiDocController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String apiDocumentation() {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<title>AgriTech Finance API</title>" +
                "<style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #333; background: #fafafa; }" +
                "h1 { font-size: 24px; color: #111; margin-bottom: 5px; }" +
                "p { color: #666; margin-top: 0; }" +
                "h2 { font-size: 18px; margin-top: 30px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #444; }" +
                ".endpoint { display: flex; align-items: center; background: #fff; border: 1px solid #e1e4e8; border-radius: 6px; margin-bottom: 10px; padding: 12px 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }" +
                ".badge-get { background: #61affe; color: white; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-right: 15px; min-width: 45px; text-align: center; }" +
                ".badge-post { background: #49cc90; color: white; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-right: 15px; min-width: 45px; text-align: center; }" +
                ".path { font-family: monospace; font-weight: bold; color: #333; margin-right: 15px; font-size: 14px; }" +
                ".desc { color: #555; font-size: 14px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<h1>AgriTech Finance API</h1>" +
                "<p>Production-ready REST API for agricultural finance management backed by PostgreSQL.</p>" +
                "<h2>Farmer Endpoints</h2>" +
                "<div class=\"endpoint\"><span class=\"badge-post\">POST</span><span class=\"path\">/api/farmers/register</span><span class=\"desc\">Register a new farmer profile</span></div>" +
                "<div class=\"endpoint\"><span class=\"badge-post\">POST</span><span class=\"path\">/api/farmers/login</span><span class=\"desc\">Authenticate a farmer</span></div>" +
                "<div class=\"endpoint\"><span class=\"badge-get\">GET</span><span class=\"path\">/api/farmers/{id}</span><span class=\"desc\">Retrieve a specific farmer by ID</span></div>" +
                "<h2>Finance Endpoints</h2>" +
                "<div class=\"endpoint\"><span class=\"badge-post\">POST</span><span class=\"path\">/finance/expenses</span><span class=\"desc\">Log a new farm expense (JSON body required)</span></div>" +
                "<div class=\"endpoint\"><span class=\"badge-get\">GET</span><span class=\"path\">/finance/expenses?farmerId={id}</span><span class=\"desc\">Retrieve all expenses logged for a specific farmer</span></div>" +
                "</body>" +
                "</html>";
    }
}