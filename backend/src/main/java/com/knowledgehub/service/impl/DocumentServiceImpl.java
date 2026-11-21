package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.rag.RagServiceClient;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.DocumentService;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final EntityMapper entityMapper;
    private final RagServiceClient ragServiceClient;

    @Value("${app.storage.upload-dir:storage/documents}")
    private String uploadDir;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "pdf", "txt", "md", "markdown", "rst", "log", "json", "csv"
    );

    @Override
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public DocumentResponse upload(MultipartFile file, UUID workspaceId, String courseCode) throws IOException {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));

        String uploadFilename = file.getOriginalFilename();
        if (uploadFilename == null || uploadFilename.isBlank()) {
            throw new IllegalArgumentException("Invalid file name. Extension is required.");
        }
        String originalFilename = uploadFilename.replace('\\', '/');
        originalFilename = originalFilename.substring(originalFilename.lastIndexOf('/') + 1);
        if (originalFilename.isBlank() || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("Invalid file name. Extension is required.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1)
                .toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type ." + extension);
        }

        Path storageDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(storageDir);

        String filePrefix = UUID.randomUUID().toString().substring(0, 8);
        String storedFilename = filePrefix + "_" + originalFilename;
        Path targetPath = storageDir.resolve(storedFilename);

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            Files.deleteIfExists(targetPath);
            throw exception;
        }

        long sizeBytes = file.getSize();
        String formattedSize = formatFileSize(sizeBytes);

        Document document = new Document();
        document.setFilename(originalFilename);
        document.setFileType(extension);
        document.setFileSizeBytes(sizeBytes);
        document.setFileSizeFormatted(formattedSize);
        document.setStoragePath(targetPath.toString());
        document.setCourseCode(courseCode != null && !courseCode.isBlank() ? courseCode : "GEN");
        document.setWorkspace(workspace);
        document.setStatus(DocumentStatus.PENDING);
        document.setChunkCount(0);

        Document savedDocument = documentRepository.save(document);
        try {
            int chunkCount = ragServiceClient.indexDocument(
                    file.getBytes(),
                    originalFilename,
                    workspaceId.toString(),
                    savedDocument.getId().toString(),
                    document.getCourseCode());
            savedDocument.setChunkCount(chunkCount);
            savedDocument.setStatus(DocumentStatus.READY);
            documentRepository.save(savedDocument);
        } catch (ResponseStatusException exception) {
            savedDocument.setStatus(DocumentStatus.FAILED);
            documentRepository.save(savedDocument);
            throw exception;
        } catch (IOException exception) {
            savedDocument.setStatus(DocumentStatus.FAILED);
            documentRepository.save(savedDocument);
            throw exception;
        }
        return entityMapper.toDocumentResponse(savedDocument);
    }

    @Override
    public DocumentResponse create(DocumentCreateRequest request, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));

        Document document = new Document();
        document.setFilename(request.filename());
        document.setFileType(request.fileType());
        document.setFileSizeBytes(request.fileSizeBytes() != null ? request.fileSizeBytes() : 0L);
        document.setFileSizeFormatted(request.fileSizeFormatted() != null ? request.fileSizeFormatted() : "0 KB");
        document.setStoragePath(request.storagePath());
        document.setCourseCode(request.courseCode() != null ? request.courseCode() : "GEN");
        document.setWorkspace(workspace);
        document.setStatus(DocumentStatus.PENDING);
        document.setChunkCount(0);

        Document savedDocument = documentRepository.save(document);
        return mapToCustomResponse(savedDocument);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse getById(UUID id) {
        return documentRepository.findById(id)
                .map(this::mapToCustomResponse)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getByWorkspace(UUID workspaceId, String courseCode, String fileType) {
        List<Document> list;
        boolean hasCourse = courseCode != null && !courseCode.equalsIgnoreCase("all");
        boolean hasType = fileType != null && !fileType.equalsIgnoreCase("all");

        if (hasCourse) {
            list = documentRepository.findByWorkspaceIdAndCourseCodeOrderByCreatedAtDesc(workspaceId, courseCode);
        } else if (hasType) {
            list = documentRepository.findByWorkspaceIdAndFileTypeOrderByCreatedAtDesc(workspaceId, fileType);
        } else {
            list = documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        }

        return list.stream().map(this::mapToCustomResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getByWorkspaceAndStatus(UUID workspaceId, DocumentStatus status) {
        return documentRepository.findByWorkspaceIdAndStatus(workspaceId, status)
                .stream()
                .map(this::mapToCustomResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadAsResource(UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));

        try {
            Path filePath = Paths.get(document.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file at storage path: " + document.getStoragePath());
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed path url", e);
        }
    }

    @Override
    public DocumentResponse update(UUID id, DocumentUpdateRequest changes) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));

        if (changes.filename() != null) document.setFilename(changes.filename());
        if (changes.fileType() != null) document.setFileType(changes.fileType());
        if (changes.fileSizeBytes() != null) document.setFileSizeBytes(changes.fileSizeBytes());
        if (changes.fileSizeFormatted() != null) document.setFileSizeFormatted(changes.fileSizeFormatted());
        if (changes.storagePath() != null) document.setStoragePath(changes.storagePath());
        if (changes.courseCode() != null) document.setCourseCode(changes.courseCode());
        if (changes.status() != null) document.setStatus(changes.status());
        if (changes.chunkCount() != null) document.setChunkCount(changes.chunkCount());

        Document updatedDocument = documentRepository.save(document);
        return mapToCustomResponse(updatedDocument);
    }

    @Override
    public void delete(UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));

        ragServiceClient.deleteDocument(id.toString());
        if (document.getStoragePath() != null) {
            try {
                Path filePath = Paths.get(document.getStoragePath());
                Files.deleteIfExists(filePath);
            } catch (IOException exception) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Could not remove the stored document file", exception);
            }
        }

        documentRepository.delete(document);
    }

    private DocumentResponse mapToCustomResponse(Document doc) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault());
        String uploadedAtStr = doc.getCreatedAt() != null ? formatter.format(doc.getCreatedAt()) : "Just now";

        return new DocumentResponse(
                doc.getId(),
                doc.getFilename(),
                doc.getFilename(), // title
                doc.getFileType(),
                doc.getFileType(), // type
                doc.getFileSizeBytes(),
                doc.getFileSizeFormatted(),
                doc.getFileSizeFormatted(), // size
                doc.getStoragePath(),
                doc.getCourseCode(),
                doc.getWorkspace() != null ? doc.getWorkspace().getId() : null,
                doc.getStatus(),
                doc.getChunkCount(),
                doc.getChunkCount(), // chunks
                doc.getCreatedAt(),
                uploadedAtStr
        );
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024 * 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        }
        return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
    }
}