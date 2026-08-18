package com.rarcafe.config;

import com.rarcafe.model.MenuItem;
import com.rarcafe.repository.MenuItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final MenuItemRepository menuItemRepository;

    public DataSeeder(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    public void run(String... args) {
        if (menuItemRepository.count() > 0) return;

        menuItemRepository.saveAll(java.util.List.of(
            new MenuItem("Brewed With Love", "Filter Coffee", "Strong South Indian filter coffee in a steel tumbler", 80.0),
            new MenuItem("Brewed With Love", "Elaichi Chai", "Fresh milk tea brewed with cardamom", 50.0),
            new MenuItem("Brewed With Love", "Masala Coffee", "House coffee with a light touch of warming spices", 95.0),
            new MenuItem("Brewed With Love", "Cold Coffee", "Chilled, creamy coffee topped with froth", 120.0),

            new MenuItem("Tea Leaves & Time", "Adrak Chai", "Ginger tea simmered slow for a bold cup", 55.0),
            new MenuItem("Tea Leaves & Time", "Kashmiri Kahwa", "Saffron green tea with almonds", 110.0),
            new MenuItem("Tea Leaves & Time", "Lemon Iced Tea", "Refreshing tea with lemon and mint", 90.0),

            new MenuItem("Between The Pages", "Paneer Kathi Roll", "Soft roll stuffed with spiced paneer and onions", 140.0),
            new MenuItem("Between The Pages", "Mumbai Veg Sandwich", "Grilled sandwich with chutney, veggies, and cheese", 130.0),
            new MenuItem("Between The Pages", "Samosa Chaat", "Crispy samosa topped with curd, chutneys, and sev", 110.0),
            new MenuItem("Between The Pages", "Pav Bhaji", "Butter-toasted pav served with rich bhaji", 150.0),

            new MenuItem("Chapter Endings", "Gulab Jamun", "Warm gulab jamun served with a scoop of vanilla ice cream", 90.0),
            new MenuItem("Chapter Endings", "Rasmalai", "Soft cottage cheese dumplings in chilled saffron milk", 110.0),
            new MenuItem("Chapter Endings", "Kulfi Falooda", "Traditional kulfi with falooda and rose syrup", 130.0),

            new MenuItem("Reader's Specials", "Tandoori Paneer Pizza", "Cafe-style pizza topped with tandoori paneer and capsicum", 220.0),
            new MenuItem("Reader's Specials", "Loaded Masala Fries", "Crispy fries tossed in desi masala and cheese", 140.0)
        ));

        System.out.println("Seeded Read & Roast menu with " + menuItemRepository.count() + " items.");
    }
}
