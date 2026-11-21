package com.knowledgehub.entity;

/**
 * Ai trả tiền cho một lượt gọi LLM. Tab Analytics tách chi phí theo hai nguồn
 * này để biết project đang tiêu bao nhiêu và người dùng tự trả bao nhiêu.
 */
public enum UsageActorType {
    /**
     * Bill trả bởi platform / starter kit của project.
     */
    PLATFORM,
    /**
     * Bill trả bởi API key cá nhân của user.
     */
    PERSONAL
}
