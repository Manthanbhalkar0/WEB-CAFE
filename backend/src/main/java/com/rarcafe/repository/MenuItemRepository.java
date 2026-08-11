package com.rarcafe.repository;

import com.rarcafe.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
}
