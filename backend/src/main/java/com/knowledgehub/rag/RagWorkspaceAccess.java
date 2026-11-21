package com.knowledgehub.rag;

import com.knowledgehub.entity.Document;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.WorkspaceMemberRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class RagWorkspaceAccess {
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final DocumentRepository documentRepository;

    public RagWorkspaceAccess(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            DocumentRepository documentRepository) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.documentRepository = documentRepository;
    }

    public void requireReadAccess(UUID ownerId, UUID workspaceId, List<UUID> documentIds) {
        var workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        boolean isOwner = workspace.getOwner() != null && ownerId.equals(workspace.getOwner().getId());
        if (!isOwner && !memberRepository.existsByWorkspaceIdAndUserId(workspaceId, ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace access denied");
        }

        for (UUID documentId : documentIds) {
            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
            if (document.getWorkspace() == null || !workspaceId.equals(document.getWorkspace().getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in workspace");
            }
        }
    }

    public void requireWorkspaceOwner(UUID userId, UUID workspaceId) {
        var workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (workspace.getOwner() == null || !userId.equals(workspace.getOwner().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace owner access required");
        }
    }
}
