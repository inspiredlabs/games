<script>

</script>

<!-- FIX: Fixed loading overlay condition to be clearer -->
<div class="absolute top-0 left-0 w-100 vh-100 flex items-center justify-center bg-black z-max">
  <div class="loader"></div>
</div>

<style>
.loader {
  width: 50px;
  height: 50px;
  border: 6px solid ;
  border-top: 6px solid magenta;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg) }
  100% { transform: rotate(360deg) }
}
</style>
