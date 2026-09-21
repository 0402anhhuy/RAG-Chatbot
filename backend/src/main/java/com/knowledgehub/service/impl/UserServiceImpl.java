package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.UserCreateRequest;
import com.knowledgehub.dto.request.UserUpdateRequest;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        // Khi tích hợp Spring Security, thay bằng: passwordEncoder.encode(request.password())
        user.setPasswordHash(request.password());
        user.setRole(request.role() != null ? request.role() : UserRole.USER);
        user.setActive(true);

        User savedUser = userRepository.save(user);
        return UserResponse.fromEntity(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return userRepository.findById(id)
                .map(UserResponse::fromEntity)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(UserResponse::fromEntity)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + email));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepository.findAll()
                .stream()
                .map(UserResponse::fromEntity)
                .toList();
    }

    @Override
    public UserResponse update(UUID id, UserUpdateRequest changes) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + id));

        if (changes.email() != null
                && !changes.email().equalsIgnoreCase(user.getEmail())
                && userRepository.existsByEmailIgnoreCase(changes.email())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        if (changes.name() != null) user.setName(changes.name());
        if (changes.email() != null) user.setEmail(changes.email());
        if (changes.password() != null) user.setPasswordHash(changes.password());
        if (changes.role() != null) user.setRole(changes.role());

        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Override
    public UserResponse setActive(UUID id, boolean active) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + id));
        user.setActive(active);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Override
    public void delete(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + id));
        userRepository.delete(user);
    }
}