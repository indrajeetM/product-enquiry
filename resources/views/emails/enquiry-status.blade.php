<h1>Product enquiry {{ $details['status'] }}</h1>

<p>Your enquiry for <strong>{{ $details['product_title'] }}</strong> has been updated.</p>
<ul>
    <li>Category: {{ $details['category'] }}</li>
    <li>Price: {{ $details['price'] }}</li>
</ul>

<h2>Your enquiry</h2>
<p>{{ $details['description'] }}</p>

<p>Status: {{ $details['status'] }}</p>

@if (! empty($details['admin_remarks']))
    <h2>Admin remarks</h2>
    <p>{{ $details['admin_remarks'] }}</p>
@endif
