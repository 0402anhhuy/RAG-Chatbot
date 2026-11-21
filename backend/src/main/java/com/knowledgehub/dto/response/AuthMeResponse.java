package com.knowledgehub.dto.response;

import java.util.UUID;

public record AuthMeResponse(
        UUID userId,
        UserResponse user,
        UserSettingsResponse settings,
        long activeTaskCount) {

}
