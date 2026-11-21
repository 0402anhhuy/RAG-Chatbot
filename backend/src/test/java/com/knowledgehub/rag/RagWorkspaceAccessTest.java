package com.knowledgehub.rag;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.WorkspaceMemberRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class RagWorkspaceAccessTest {
    @Test
    void deniesUserWhoIsNotWorkspaceOwnerOrMember() {
        WorkspaceRepository workspaces = org.mockito.Mockito.mock(WorkspaceRepository.class);
        WorkspaceMemberRepository members = org.mockito.Mockito.mock(WorkspaceMemberRepository.class);
        DocumentRepository documents = org.mockito.Mockito.mock(DocumentRepository.class);
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Workspace workspace = new Workspace();
        workspace.setId(workspaceId);

        when(workspaces.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(members.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(false);

        RagWorkspaceAccess access = new RagWorkspaceAccess(workspaces, members, documents);
        assertThrows(ResponseStatusException.class, () -> access.requireReadAccess(userId, workspaceId, List.of()));
    }

    @Test
    void rejectsDocumentOutsideAuthorizedWorkspace() {
        WorkspaceRepository workspaces = org.mockito.Mockito.mock(WorkspaceRepository.class);
        WorkspaceMemberRepository members = org.mockito.Mockito.mock(WorkspaceMemberRepository.class);
        DocumentRepository documents = org.mockito.Mockito.mock(DocumentRepository.class);
        UUID ownerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID otherWorkspaceId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        User owner = new User();
        owner.setId(ownerId);
        Workspace workspace = new Workspace();
        workspace.setId(workspaceId);
        workspace.setOwner(owner);
        Workspace otherWorkspace = new Workspace();
        otherWorkspace.setId(otherWorkspaceId);
        Document document = new Document();
        document.setId(documentId);
        document.setWorkspace(otherWorkspace);

        when(workspaces.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(documents.findById(documentId)).thenReturn(Optional.of(document));

        RagWorkspaceAccess access = new RagWorkspaceAccess(workspaces, members, documents);
        assertThrows(
                ResponseStatusException.class,
                () -> access.requireReadAccess(ownerId, workspaceId, List.of(documentId)));
    }

    @Test
    void onlyWorkspaceOwnerCanChangeMembership() {
        WorkspaceRepository workspaces = org.mockito.Mockito.mock(WorkspaceRepository.class);
        WorkspaceMemberRepository members = org.mockito.Mockito.mock(WorkspaceMemberRepository.class);
        DocumentRepository documents = org.mockito.Mockito.mock(DocumentRepository.class);
        UUID workspaceId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        User owner = new User();
        owner.setId(ownerId);
        Workspace workspace = new Workspace();
        workspace.setId(workspaceId);
        workspace.setOwner(owner);
        when(workspaces.findById(workspaceId)).thenReturn(Optional.of(workspace));

        RagWorkspaceAccess access = new RagWorkspaceAccess(workspaces, members, documents);
        assertThrows(
                ResponseStatusException.class,
                () -> access.requireWorkspaceOwner(memberId, workspaceId));
    }
}
