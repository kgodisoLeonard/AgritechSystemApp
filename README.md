# AgritechSystemApp

A two-sided app that helps small-scale farmers track their finances (so they
can tell if they're profitable and qualify for loans) and form group orders
with nearby farmers to unlock bulk pricing from suppliers.

## How it works

- **Farmers** register with their location and log expenses (including
  purchases of inputs made "normally" from anywhere) and sales.
- A **matching engine** (`src/services/matching.js`) looks for farmers who
  logged the same input purchase around the same time and clusters them by
  geographic proximity. Clusters big enough to matter become **group
  orders**.
- Farmers can **join a group order** to unlock bulk pricing when everyone
  buys from the same matched supplier.
- **Suppliers** (local agri-stores/co-ops) are manually onboarded with a
  simple product listing, and are **notified** when a group order forms in
  their area. Payment and delivery/pickup happen directly between the farmer
  and supplier, outside the app.

## Running the app

```bash
npm install
npm start        # starts the API on http://localhost:3000
npm test         # runs the test suite
```

## API overview

| Method | Path                              | Description                                   |
| ------ | --------------------------------- | ---------------------------------------------- |
| POST   | `/farmers`                        | Register a farmer                              |
| GET    | `/farmers/:id/summary`            | Total expenses/sales and profit for a farmer   |
| POST   | `/expenses`                       | Log a farmer expense (input purchase, etc.)    |
| POST   | `/sales`                          | Log a farmer sale                              |
| POST   | `/suppliers`                      | Onboard a supplier                             |
| POST   | `/suppliers/:id/products`         | Add a product/input to a supplier's listing    |
| GET    | `/suppliers/:id/notifications`    | Notifications for group orders near a supplier |
| POST   | `/group-orders/match`             | Run the matching engine for an item            |
| POST   | `/group-orders/:id/join`          | Join an existing group order                   |