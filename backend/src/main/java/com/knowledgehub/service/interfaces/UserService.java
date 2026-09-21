package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.UserCreateRequest;
import com.knowledgehub.dto.request.UserUpdateRequest;
import com.knowledgehub.dto.response.UserResponse;
import java.util.List;
import java.util.UUID;

public interface UserService {
    UserResponse create(UserCreateRequest request);
    UserResponse getById(UUID id);
    UserResponse getByEmail(String email);
    List<UserResponse> getAll();
    UserResponse update(UUID id, UserUpdateRequest changes);
    UserResponse setActive(UUID id, boolean active);
    void delete(UUID id);
}