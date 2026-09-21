package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.WorkspaceMemberRequest;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.entity.WorkspaceMember;
import com.knowledgehub.entity.WorkspaceMemberRole;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceMemberRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.WorkspaceMemberService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkspaceMemberServiceImpl implements WorkspaceMemberService {

    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;

    @Override
    public WorkspaceMemberResponse add(UUID workspaceId, WorkspaceMemberRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + request.userId()));

        if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, request.userId())) {
            throw new IllegalArgumentException("User is already a member of this workspace");
        }

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(workspace);
        member.setUser(user);
        member.setRole(request.role() != null ? request.role() : WorkspaceMemberRole.MEMBER);

        WorkspaceMember saved = memberRepository.save(member);
        return entityMapper.toWorkspaceMemberResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> getByWorkspace(UUID workspaceId) {
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new ServiceEntityNotFoundException("Workspace not found: " + workspaceId);
        }
        return memberRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(entityMapper::toWorkspaceMemberResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> getByUser(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new ServiceEntityNotFoundException("User not found: " + userId);
        }
        return memberRepository.findByUserId(userId)
                .stream()
                .map(entityMapper::toWorkspaceMemberResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceMemberResponse get(UUID workspaceId, UUID userId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(entityMapper::toWorkspaceMemberResponse)
                .orElseThrow(() -> new ServiceEntityNotFoundException(
                        "Member not found with workspaceId: " + workspaceId + " and userId: " + userId));
    }

    @Override
    public WorkspaceMemberResponse updateRole(UUID workspaceId, UUID userId, WorkspaceMemberRole role) {
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException(
                        "Member not found with workspaceId: " + workspaceId + " and userId: " + userId));

        member.setRole(role);
        WorkspaceMember updated = memberRepository.save(member);
        return entityMapper.toWorkspaceMemberResponse(updated);
    }

    @Override
    public void remove(UUID workspaceId, UUID userId) {
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException(
                        "Member not found with workspaceId: " + workspaceId + " and userId: " + userId));
        memberRepository.delete(member);
    }
}