package com.knowledgehub.rag;

import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/documents")
public class DocumentRagController {
    private final RestClient client;

    public DocumentRagController(@Value("${rag.fastapi.base-url}") String baseUrl) {
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<?, ?> upload(@RequestPart("file") MultipartFile file) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", file.getResource());

        return client.post()
                .uri("/api/documents/upload")
                .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(body.build())
                .retrieve()
                .body(Map.class);
    }
}
