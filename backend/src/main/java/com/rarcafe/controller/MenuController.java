package com.rarcafe.controller;

import com.rarcafe.model.MenuItem;
import com.rarcafe.repository.MenuItemRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuItemRepository menuItemRepository;

    public MenuController(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @GetMapping
    public List<MenuItem> getMenu() {
        return menuItemRepository.findAll();
    }

    @PostMapping
    public MenuItem addItem(@RequestBody MenuItem item) {
        return menuItemRepository.save(item);
    }

    @PutMapping("/{id}")
    public MenuItem updateItem(@PathVariable Long id, @RequestBody MenuItem update) {
        MenuItem existing = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        existing.setName(update.getName());
        existing.setDescription(update.getDescription());
        existing.setPrice(update.getPrice());
        existing.setCategory(update.getCategory());
        existing.setAvailable(update.getAvailable());
        return menuItemRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public void deleteItem(@PathVariable Long id) {
        menuItemRepository.deleteById(id);
    }
}
