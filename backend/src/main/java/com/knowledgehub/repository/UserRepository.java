package com.knowledgehub.repository;

import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    long countByRole(UserRole role);
    long countByActive(boolean active);
    long countByCreatedAtAfter(Instant from);
    long countByCreatedAtBetween(Instant from, Instant to);
    long countByRoleAndCreatedAtBetween(UserRole role, Instant from, Instant to);

    List<User> findTop8ByOrderByCreatedAtDesc();

    @Query("""
            select u from User u
            where (:search is null or :search = ''
                   or lower(u.name) like lower(concat('%', :search, '%'))
                   or lower(u.email) like lower(concat('%', :search, '%')))
              and (:role is null or u.role = :role)
              and (:active is null or u.active = :active)
            order by u.createdAt desc
            """)
    Page<User> search(
            @Param("search") String search,
            @Param("role") UserRole role,
            @Param("active") Boolean active,
            Pageable pageable);

    @Query(value = """
            select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*)
            from users
            where created_at >= :from
            group by 1
            order by 1
            """, nativeQuery = true)
    List<Object[]> countDailyCreatedSince(@Param("from") Instant from);
}
