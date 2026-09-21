package com.knowledgehub.service.exception;

public class ServiceEntityNotFoundException extends RuntimeException {
    public ServiceEntityNotFoundException(String message) {
        super(message);
    }
}
